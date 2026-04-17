const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { generateContent } = require('../lib/gemini');
const { supabase } = require('../lib/supabase');
const { normalizeCategory, isCleanMerchant, isLikelyTransactionalText } = require('../services/category');

// Known Indian bank/UPI SMS senders (headers)
const KNOWN_SENDERS = [
  'HDFC', 'HDFCBK', 'SBIINB', 'SBI', 'ICICI', 'ICICIB', 'AXISBK', 'AXIS',
  'KOTAKB', 'KOTAK', 'PAYTM', 'GPAY', 'PHONEPE', 'YESBNK', 'IDBIBK',
  'PNBSMS', 'BOBIBD', 'CANBNK', 'UNIONB', 'CENTBK', 'INDBNK', 'FEDBNK',
  'RBLBNK', 'AUBANK', 'UJJIVN', 'BANDHN', 'BOIIND'
];

const ALLOWED_CATEGORIES = new Set([
  'food', 'transport', 'utilities', 'shopping', 'health',
  'entertainment', 'education', 'finance', 'fashion', 'travel'
]);

const smsParseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
});

function isTrustedSender(sender) {
  if (!sender) return false;
  const upper = sender.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return KNOWN_SENDERS.some(s => upper.includes(s));
}

function hasFinancialHint(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const hints = [
    'upi', 'utr', 'imps', 'neft', 'rtgs', 'debited', 'credited',
    'spent', 'received', 'withdrawn', 'deposited', 'txn', 'transaction',
    'payment', 'inr', 'rs', 'a/c', 'account', 'balance'
  ];
  return hints.some(h => lower.includes(h));
}

function inferTypeFromText(text) {
  const lower = (text || '').toLowerCase();
  if (/\b(debited|spent|paid|purchase|sent|dr)\b/.test(lower)) return 'debit';
  if (/\b(credited|received|deposited|refund|cr)\b/.test(lower)) return 'credit';
  return null;
}

function extractHeuristicTransaction(smsText) {
  const text = (smsText || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const type = inferTypeFromText(text);

  const amountMatch = text.match(/(?:inr|rs\.?|₹|amt|debited by|credited by)\s*[:]?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? Number(String(amountMatch[1]).replace(/,/g, '')) : null;
  if (!amount || isNaN(amount) || !type) return null;

  const merchantMatch = text.match(/(?:to|at|from)\s+([A-Za-z0-9&._\- ]{2,40}?)(?:\.|,| on | via |\sUTR|\sRef|$)/i);
  const merchantName = merchantMatch?.[1]?.trim() || 'Unknown';

  const refMatch = text.match(/(?:utr|ref(?:erence)?|txn(?:\s*id)?|upi|info|id)[:\s-]*([A-Za-z0-9\-]{6,})/i);
  const referenceNumber = refMatch?.[1] || null;

  const dateMatch = text.match(/\b(\d{1,2})[-/](\d{1,2}|[A-Za-z]{3})[-/](\d{2,4})\b/i);
  let extractedDate = null;
  if (dateMatch) {
    const d = dateMatch[1], m = dateMatch[2], y = dateMatch[3];
    extractedDate = new Date(`${m} ${d} ${y}`).toISOString();
  }

  return {
    amount,
    type,
    merchant_name: merchantName,
    reference_number: referenceNumber,
    date: extractedDate,
  };
}

function sanitizeCategory(category) {
  const normalized = (category || '').toLowerCase().trim();
  if (ALLOWED_CATEGORIES.has(normalized)) return normalized;
  return 'other';
}

/**
 * POST /api/v1/sms/parse
 * Body: { sms_text: string, sender: string }
 */
router.post('/parse', smsParseLimiter, authenticate, async (req, res) => {
  const { sms_text, sender, timestamp } = req.body;
  const trustedSender = isTrustedSender(sender);
  const financialHint = hasFinancialHint(sms_text);

  if (process.env.NODE_ENV !== 'production' || process.env.SMS_DEBUG === 'true') {
    console.log(`[sms.parse] user=${req.user?.id} sender=${sender || 'unknown'} trusted=${trustedSender} hint=${financialHint}`);
  }

  if (!sms_text) {
    return res.status(400).json({ error: 'sms_text is required' });
  }

  if (!trustedSender && !financialHint) {
    return res.status(200).json({ skipped: true, reason: 'not recognized as financial sms' });
  }

  if (!isLikelyTransactionalText(sms_text)) {
    return res.status(200).json({ skipped: true, reason: 'not transactional message' });
  }

  const prompt = `Extract from this UPI/bank SMS: merchant name, amount (number only), transaction type (credit or debit), date, and reference/UTR number.
IMPORTANT: Look for 12-digit numeric strings or alphanumeric codes after 'Ref', 'UTR', 'UPI', or 'Info' - these are reference numbers.
Respond in JSON only: {"merchant_name":"...","amount":0,"type":"credit|debit","date":"ISO8601","reference_number":"...","category":"food|transport|utilities|shopping|health|entertainment|education|finance|other"}.
If this is not a financial transaction SMS, respond: {"error":"not_financial"}.

SMS: ${sms_text}`;

  let extracted;
  extracted = extractHeuristicTransaction(sms_text);

  if (!extracted) {
    try {
      extracted = await generateContent(prompt, '', true);
    } catch (err) {
      return res.status(200).json({ skipped: true, reason: 'extraction_failed', detail: err.message });
    }
  }

  if (extracted.error === 'not_financial') {
    return res.status(200).json({ skipped: true, reason: 'not a financial transaction' });
  }

  if (!extracted.amount) {
    return res.status(422).json({ error: 'Could not extract transaction details', raw: extracted });
  }

  extracted.type = extracted.type || inferTypeFromText(sms_text);
  if (!['credit', 'debit'].includes(extracted.type)) {
    return res.status(200).json({ skipped: true, reason: 'could not infer transaction type' });
  }

  const merchantName = isCleanMerchant(extracted.merchant_name) ? extracted.merchant_name.trim() : null;
  const category = sanitizeCategory(
    normalizeCategory(extracted.category, `${extracted.merchant_name || ''} ${sms_text || ''}`)
  );

  if (!merchantName && !financialHint) {
    return res.status(200).json({ skipped: true, reason: 'unclear merchant data' });
  }

  // Determine final transaction date
  // PRIORITY: 1. Gemini/Heuristic extracted from text, 2. metadata timestamp, 3. now
  let transactionDate;
  
  if (extracted && extracted.date && !isNaN(new Date(extracted.date).getTime())) {
    transactionDate = new Date(extracted.date).toISOString();
  } else if (timestamp) {
    const ts = Number(timestamp);
    if (!isNaN(ts) && ts > 0) {
      transactionDate = new Date(ts).toISOString();
    }
  }

  if (!transactionDate) {
    transactionDate = new Date().toISOString();
  }

  if (process.env.NODE_ENV !== 'production' || process.env.SMS_DEBUG === 'true') {
    console.log(`[sms.parse] user=${req.user.id} sender=${sender} text_date=${extracted?.date} body_ts=${timestamp} final_date=${transactionDate}`);
  }

  const transactionAmount = Number(extracted.amount);
  if (isNaN(transactionAmount) || transactionAmount <= 0) {
    if (process.env.SMS_DEBUG === 'true') console.log(`[sms.skip] Invalid amount: ${extracted.amount}`);
    return res.status(200).json({ skipped: true, reason: 'could not extract valid amount' });
  }

  const baseInsert = {
    user_id:          req.user.id,
    source:           'sms',
    type:             extracted.type,
    amount:           transactionAmount,
    merchant_name:    merchantName,
    category,
    transaction_date: transactionDate,
    reference_number: extracted.reference_number || null,
    raw_sms: sms_text,
  };

  try {
    let result;
    if (baseInsert.reference_number) {
      result = await supabase
        .from('transactions')
        .upsert(baseInsert, { onConflict: 'reference_number' })
        .select()
        .single();
    } else {
      result = await supabase
        .from('transactions')
        .insert(baseInsert)
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      console.error(`[sms.error] Database error:`, JSON.stringify(error));
      if (error.code === '23505') {
        return res.status(200).json({ skipped: true, reason: 'duplicate transaction' });
      }
      return res.status(500).json({ error: 'Database operation failed', detail: error.message, code: error.code });
    }

    if (!data) {
       return res.status(500).json({ error: 'No data returned from database' });
    }

    return res.status(201).json({
      transaction_id: data.id,
      merchant_name:  data.merchant_name,
      amount:         data.amount,
      type:           data.type,
      category:       data.category,
    });
  } catch (err) {
    console.error(`[sms.crash] Critical error:`, err);
    return res.status(500).json({ error: 'Internal server crash', detail: err.message });
  }
});

module.exports = router;
