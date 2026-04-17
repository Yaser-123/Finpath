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

module.exports = { inferCategory, normalizeCategory };
