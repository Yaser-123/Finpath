const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { generateContent, buildSystemInstruction } = require('../lib/gemini');
const { fetchMarketData } = require('../services/yfinance');
const { searchSerper } = require('../services/serper');
const { normalizeCategory } = require('../services/category');

function buildHeuristicSpendingInsights(categoryTotals) {
  const entries = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return entries.map(([category, currentSpend], idx) => {
    const suggestedCap = Math.max(0, Math.round(currentSpend * 0.82));
    const priority = idx < 2 ? 'high' : (idx < 4 ? 'medium' : 'low');
    return {
      category,
      current_spend: Math.round(currentSpend),
      suggested_cap: suggestedCap,
      saving_tip: `Try capping ${category} spends to ~INR ${suggestedCap} next month and review weekly.`,
      priority,
    };
  });
}

async function getUserContext(userId) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return profile || {};
}

/**
 * POST /api/v1/agent/spending-analysis
 */
router.post('/spending-analysis', authenticate, async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: txns } = await supabase
    .from('transactions')
    .select('category, amount, type')
    .eq('user_id', req.user.id)
    .eq('type', 'debit')
    .gte('transaction_date', since.toISOString());

  const categoryTotals = {};
  let totalDebit = 0;
  (txns || []).forEach(t => {
    const amount = parseFloat(t.amount || 0);
    totalDebit += amount;
    const category = normalizeCategory(t.category, '');
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  });

  if (totalDebit <= 0) {
    return res.json({
      insights: [],
      summary: 'Not enough debit transactions in the last 30 days to generate spending insights.'
    });
  }

  const profile = await getUserContext(req.user.id);
  const sysInstruct = buildSystemInstruction({
    monthly_income: profile.monthly_income,
    occupation: profile.occupation,
  });

  const prompt = `Analyse these spending categories from the last 30 days (in INR) and identify overspending:
${JSON.stringify(categoryTotals, null, 2)}

Return JSON: {"insights": [{"category":"...","current_spend":0,"suggested_cap":0,"saving_tip":"...","priority":"high|medium|low"}],"summary":"..."}
Rank by largest potential saving. Be specific and actionable. 3-6 insights max.`;

  try {
    const result = await generateContent(prompt, sysInstruct, true);
    return res.json(result);
  } catch (err) {
    const fallbackInsights = buildHeuristicSpendingInsights(categoryTotals);
    return res.json({
      insights: fallbackInsights,
      summary: 'AI analysis unavailable right now. Showing rule-based spending insights.'
    });
  }
});

/**
 * POST /api/v1/agent/investment-suggestions
 * Body: { monthly_investable_amount }
 */
router.post('/investment-suggestions', authenticate, async (req, res) => {
  const { monthly_investable_amount = 5000 } = req.body;
  const profile = await getUserContext(req.user.id);

  let marketData = [];
  try {
    marketData = await fetchMarketData();
  } catch (err) {
    console.warn('yfinance failed, proceeding without live data:', err.message);
  }

  let newsSignals = [];
  try {
    const searchQueries = [
      'Nifty 50 market outlook India',
      'Bitcoin INR trend India',
      'Gold ETF India outlook'
    ];
    const allNews = await Promise.all(searchQueries.map((q) => searchSerper(q, 3)));
    newsSignals = allNews.flat().slice(0, 8);
  } catch (err) {
    console.warn('serper failed, proceeding without news:', err.message);
  }

  const sysInstruct = buildSystemInstruction({
    monthly_income: profile.monthly_income,
    occupation: profile.occupation,
  });

  const prompt = `The user has ₹${monthly_investable_amount}/month to invest.
Market signals (from yfinance): ${JSON.stringify(marketData, null, 2)}
Recent market headlines: ${JSON.stringify(newsSignals, null, 2)}

Create investment suggestions for Indian users. Mix: NSE stocks, gold, and optionally crypto/BTC.
Return JSON: {"suggestions":[{"ticker":"...","asset_type":"stock|crypto|gold|commodity","signal":"buy|hold|sell","sentiment":"positive|neutral|negative","summary":"...","allocation_pct":0,"risk":"low|medium|high"}],"market_note":"..."}
Total allocation_pct must sum to 100. Bias toward buy signals. Include a brief summary for each.`;

  try {
    const result = await generateContent(prompt, sysInstruct, true);

    // Save to investments table
    const rows = (result.suggestions || []).map(s => ({
      user_id:          req.user.id,
      ticker:           s.ticker,
      asset_type:       s.asset_type,
      suggested:        true,
      analysis_summary: s.summary,
      news_sentiment:   s.sentiment,
      technical_signal: s.signal,
    }));

    if (rows.length > 0) {
      await supabase.from('investments').insert(rows);
    }

    return res.json({
      suggestions: result.suggestions || [],
      market_note: result.market_note || null,
      market_data: marketData,
      headlines: newsSignals,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Investment analysis failed', detail: err.message });
  }
});

/**
 * GET /api/v1/agent/insurance-suggestions
 */
router.get('/insurance-suggestions', authenticate, async (req, res) => {
  const profile = await getUserContext(req.user.id);
  const sysInstruct = buildSystemInstruction({
    monthly_income: profile.monthly_income,
    occupation: profile.occupation,
  });

  const prompt = `Suggest 2-3 insurance products for an Indian ${profile.occupation || 'salaried'} person with monthly income ₹${profile.monthly_income || 30000}.
Return JSON: {"suggestions":[{"type":"...","reason":"...","estimated_premium_inr_monthly":0}]}
Types to consider: term life, health, accidental, critical illness. Specify real premium ranges in INR.`;

  try {
    const result = await generateContent(prompt, sysInstruct, true);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Insurance analysis failed', detail: err.message });
  }
});

/**
 * GET /api/v1/agent/instant-money
 */
router.get('/instant-money', authenticate, async (req, res) => {
  const profile = await getUserContext(req.user.id);
  const sysInstruct = buildSystemInstruction({
    monthly_income: profile.monthly_income,
    occupation: profile.occupation,
  });

  const prompt = `Suggest ways to earn extra money for an Indian ${profile.occupation || 'person'}.
Return JSON: {
  "side_hustles": [{"title":"...","potential_monthly_inr":0,"how_to_start":"..."}],
  "gig_platforms": [{"name":"...","category":"...","sign_up_url":"...","typical_earning":"..."}],
  "asset_ideas": [{"asset":"...","idea":"...","effort":"low|medium|high"}]
}
Be very specific to India (use Indian platforms like Urban Company, Swiggy, Zomato, Fiverr).`;

  try {
    const result = await generateContent(prompt, sysInstruct, true);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Instant money analysis failed', detail: err.message });
  }
});

module.exports = router;
