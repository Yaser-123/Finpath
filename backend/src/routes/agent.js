const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { generateContent, buildSystemInstruction } = require('../lib/gemini');
const { fetchMarketData } = require('../services/yfinance');

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
  (txns || []).forEach(t => {
    categoryTotals[t.category || 'other'] = (categoryTotals[t.category || 'other'] || 0) + parseFloat(t.amount);
  });

  const profile = await getUserContext(req.user.id);
  const sysInstruct = buildSystemInstruction({
    monthly_income: profile.monthly_income,
    occupation: profile.occupation,
  });

  const prompt = `Analyse these spending categories from the last 30 days (in INR) and identify overspending:
${JSON.stringify(categoryTotals, null, 2)}

Return JSON: {"insights": [{"category":"...","current_spend":0,"suggested_cap":0,"saving_tip":"..."}]}
Rank by largest potential saving. Be specific and actionable. 3-6 insights max.`;

  try {
    const result = await generateContent(prompt, sysInstruct, true);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
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

  const sysInstruct = buildSystemInstruction({
    monthly_income: profile.monthly_income,
    occupation: profile.occupation,
  });

  const prompt = `The user has ₹${monthly_investable_amount}/month to invest.
Market signals (from yfinance): ${JSON.stringify(marketData, null, 2)}

Create investment suggestions for Indian users. Mix: NSE stocks, gold, and optionally crypto/BTC.
Return JSON: {"suggestions":[{"ticker":"...","asset_type":"stock|crypto|gold|commodity","signal":"buy|hold|sell","sentiment":"positive|neutral|negative","summary":"...","allocation_pct":0}]}
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

    return res.json(result);
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
