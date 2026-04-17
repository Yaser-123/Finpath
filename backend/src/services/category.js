const CATEGORY_KEYWORDS = {
  food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'dominos', 'pizza', 'burger', 'kfc', 'mcdonald'],
  transport: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'rail', 'petrol', 'fuel', 'fastag'],
  utilities: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'airtel', 'jio', 'bsnl', 'dth'],
  shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'blinkit', 'zepto', 'instamart'],
  fashion: ['myntra', 'ajio', 'nykaa fashion', 'lifestyle', 'pantaloons', 'westside', 'h&m', 'zara'],
  health: ['apollo', 'pharmacy', 'hospital', 'clinic', 'medicine', '1mg', 'netmeds'],
  entertainment: ['netflix', 'prime video', 'hotstar', 'spotify', 'youtube', 'bookmyshow', 'pvr'],
  education: ['udemy', 'coursera', 'fees', 'tuition', 'college', 'school', 'unacademy', 'byju'],
  finance: ['emi', 'loan', 'insurance', 'credit card', 'mutual fund', 'sip', 'fd', 'rd'],
  travel: ['airindia', 'indigo', 'makemytrip', 'goibibo', 'oyo', 'hotel', 'flight'],
};

const BAD_MERCHANT_PATTERNS = [
  /^(unknown|n\/?a|null|none)$/i,
  /stop\s*execution/i,
  /do\s*not\s*reply/i,
  /otp/i,
  /^\d{10,}$/,
];

function isCleanMerchant(name) {
  const merchant = (name || '').trim();
  if (!merchant) return false;
  return !BAD_MERCHANT_PATTERNS.some((re) => re.test(merchant));
}

function isLikelyTransactionalText(text) {
  const lower = (text || '').toLowerCase();
  if (!lower) return false;
  const patterns = [
    /\b(debited|credited|spent|paid|received|withdrawn|deposited)\b/,
    /\b(upi|utr|imps|neft|rtgs|txn|transaction|ref(?:erence)?)\b/,
    /\b(a\/c|account|balance)\b/,
  ];
  return patterns.some((re) => re.test(lower));
}

function inferCategory(text) {
  const lower = (text || '').toLowerCase();
  if (!lower.trim()) return 'other';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }

  return 'other';
}

function normalizeCategory(existingCategory, contextText) {
  const normalized = (existingCategory || '').toLowerCase().trim();
  if (normalized && normalized !== 'other') return normalized;
  return inferCategory(contextText);
}

module.exports = { inferCategory, normalizeCategory, isCleanMerchant, isLikelyTransactionalText };
