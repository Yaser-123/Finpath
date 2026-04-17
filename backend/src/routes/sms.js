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
  'RBLBNK', 'AUBANK', 'UJJIVN', 'BANDHN'
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

/**
 * POST /api/v1/sms/parse
 * Body: { sms_text: string, sender: string }
 */
router.post('/parse', authenticate, async (req, res) => {
  const { sms_text, sender } = req.body;

  if (!sms_text) {
    return res.status(400).json({ error: 'sms_text is required' });
  }

  if (!isTrustedSender(sender)) {
    return res.status(200).json({ skipped: true, reason: 'sender not a known Indian bank' });
  }

  const prompt = `Extract from this UPI/bank SMS: merchant name, amount (number only), transaction type (credit or debit), date.
Respond in JSON only: {"merchant_name":"...","amount":0,"type":"credit|debit","date":"ISO8601","category":"food|transport|utilities|shopping|health|entertainment|education|finance|other"}.
If this is not a financial transaction SMS, respond: {"error":"not_financial"}.

SMS: ${sms_text}`;

  let extracted;
  try {
    extracted = await generateContent(prompt, '', true);
  } catch (err) {
    return res.status(500).json({ error: 'Gemini extraction failed', detail: err.message });
  }

  if (extracted.error === 'not_financial') {
    return res.status(200).json({ skipped: true, reason: 'not a financial transaction' });
  }

  if (!extracted.amount || !extracted.type) {
    return res.status(422).json({ error: 'Could not extract transaction details', raw: extracted });
  }

  // Auto-categorise if Gemini didn't
  const category = extracted.category || autoCategory(extracted.merchant_name || sms_text);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id:          req.user.id,
      source:           'sms',
      type:             extracted.type,
      amount:           extracted.amount,
      merchant_name:    extracted.merchant_name || 'Unknown',
      category,
      raw_sms:          sms_text,
      transaction_date: extracted.date || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
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
