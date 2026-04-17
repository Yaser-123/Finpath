const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateContent } = require('../lib/gemini');
const { supabase } = require('../lib/supabase');

// Known Indian bank/UPI SMS senders (headers)
const KNOWN_SENDERS = [
  'HDFC', 'HDFCBK', 'SBIINB', 'SBI', 'ICICI', 'ICICIB', 'AXISBK', 'AXIS',
  'KOTAKB', 'KOTAK', 'PAYTM', 'GPAY', 'PHONEPE', 'YESBNK', 'IDBIBK',
  'PNBSMS', 'BOBIBD', 'CANBNK', 'UNIONB', 'CENTBK', 'INDBNK', 'FEDBNK',
  'RBLBNK', 'AUBANK', 'UJJIVN', 'BANDHN', 'BOIIND'
];

// Auto-category mapping from merchant / SMS keywords
const CATEGORY_KEYWORDS = {
  food:       ['swiggy', 'zomato', 'dominos', 'pizza', 'burger', 'restaurant', 'cafe', 'mcdonald', 'kfc', 'subway'],
  transport:  ['uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'petrol', 'fuel', 'namma metro'],
  utilities:  ['electricity', 'bescom', 'tata power', 'airtel', 'jio', 'bsnl', 'vi ', 'vodafone', 'internet', 'water'],
  shopping:   ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'bigbasket', 'blinkit', 'zepto', 'instamart'],
  health:     ['apollo', 'medicine', 'hospital', 'pharmacy', 'clinic', 'doctor', 'netmeds', '1mg'],
  entertainment: ['netflix', 'hotstar', 'prime video', 'spotify', 'youtube', 'bookmyshow', 'pvr', 'inox'],
  education:  ['udemy', 'coursera', 'byju', 'unacademy', 'college', 'school', 'tuition', 'fees'],
  finance:    ['emi', 'loan', 'insurance', 'mutual fund', 'fd', 'rd', 'sip', 'credit card'],
};

function autoCategory(text) {
  const lower = (text || '').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'other';
}

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

function extractHeuristicTransaction(smsText) {
  const text = (smsText || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const debitHints = ['debited', 'spent', 'paid', 'purchase', 'sent', 'dr'];
  const creditHints = ['credited', 'received', 'deposited', 'refund', 'cr'];

  const lower = text.toLowerCase();
  const type = debitHints.some(h => lower.includes(h))
    ? 'debit'
    : (creditHints.some(h => lower.includes(h)) ? 'credit' : null);

  const amountMatch = text.match(/(?:inr|rs\.?|₹)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i)
    || text.match(/(?:amount|amt)\s*(?:is|:)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);

  const amount = amountMatch ? Number(String(amountMatch[1]).replace(/,/g, '')) : null;
  if (!amount || !type) return null;

  const merchantMatch = text.match(/(?:to|at|from)\s+([A-Za-z0-9&._\- ]{2,40}?)(?:\.|,| on | via |\sUTR|\sRef|$)/i);
  const merchantName = merchantMatch?.[1]?.trim() || 'Unknown';

  const refMatch = text.match(/(?:utr|ref(?:erence)?|txn(?:\s*id)?)[:\s-]*([A-Za-z0-9\-]{6,})/i);
  const referenceNumber = refMatch?.[1] || null;

  return {
    amount,
    type,
    merchant_name: merchantName,
    reference_number: referenceNumber,
    date: new Date().toISOString(),
  };
}

/**
 * POST /api/v1/sms/parse
 * Body: { sms_text: string, sender: string }
 */
router.post('/parse', authenticate, async (req, res) => {
  const { sms_text, sender } = req.body;
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

  const prompt = `Extract from this UPI/bank SMS: merchant name, amount (number only), transaction type (credit or debit), date, and reference/UTR number.
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

  if (!extracted.amount || !extracted.type) {
    return res.status(422).json({ error: 'Could not extract transaction details', raw: extracted });
  }

  // Auto-categorise if Gemini didn't
  const category = extracted.category || autoCategory(extracted.merchant_name || sms_text);

  const baseInsert = {
    user_id:          req.user.id,
    source:           'sms',
    type:             extracted.type,
    amount:           extracted.amount,
    merchant_name:    extracted.merchant_name || 'Unknown',
    category,
    transaction_date: extracted.date || new Date().toISOString(),
  };

  const fullInsert = {
    ...baseInsert,
    raw_sms: sms_text,
    reference_number: extracted.reference_number || null,
  };

  let data;
  let error;

  ({ data, error } = await supabase
    .from('transactions')
    .insert(fullInsert)
    .select()
    .single());

  if (error && /raw_sms|reference_number/i.test(error.message || '')) {
    ({ data, error } = await supabase
      .from('transactions')
      .insert(baseInsert)
      .select()
      .single());
  }

  if (error) {
    if (error.code === '23505') {
      return res.status(200).json({ skipped: true, reason: 'duplicate transaction' });
    }
    return res.status(500).json({ error: 'Database insert failed', detail: error.message });
  }

  return res.status(201).json({
    transaction_id: data.id,
    merchant_name:  data.merchant_name,
    amount:         data.amount,
    type:           data.type,
    category:       data.category,
  });
});

module.exports = router;
