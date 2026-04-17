const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { normalizeCategory, isCleanMerchant } = require('../services/category');

/**
 * GET /api/v1/dashboard
 */
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // 1. Time-series data for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);

  // Run all queries in parallel
  const [
    { data: txThisMonth },
    { data: recentTxForTrend },
    { data: goals },
    { data: profile },
    { data: wealthThisMonth },
  ] = await Promise.all([
    supabase.from('transactions').select('type,amount,category,merchant_name,source,transaction_date').eq('user_id', userId).gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonth),
    supabase.from('transactions').select('amount,transaction_date').eq('user_id', userId).eq('type', 'debit').gte('transaction_date', sevenDaysAgo.toISOString()).lte('transaction_date', endOfMonth),
    supabase.from('goals').select('id,title,target_amount,current_amount,is_feasible').eq('user_id', userId).neq('status', 'abandoned'),
    supabase.from('profiles').select('tier,coins,monthly_income,wealth_ring_fence_pct').eq('id', userId).single(),
    supabase.from('wealth_allocations').select('*').eq('user_id', userId).eq('month', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).single(),
  ]);

  const transactions = txThisMonth || [];
  const recentDebits = recentTxForTrend || [];

  // Group daily spending for the trend chart
  const dailySpendingMap = {};
  recentDebits.forEach(t => {
    const d = new Date(t.transaction_date).toISOString().split('T')[0];
    dailySpendingMap[d] = (dailySpendingMap[d] || 0) + parseFloat(t.amount);
  });

  const spendingTrend = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    spendingTrend.push({
      date: dateStr,
      amount: dailySpendingMap[dateStr] || 0
    });
  }
  let totalIncome = 0;
  let totalExpenses = 0;
  const spendingByCategory = {};

  transactions
    .filter((t) => t.source !== 'sms' || isCleanMerchant(t.merchant_name))
    .forEach(t => {
    const amt = parseFloat(t.amount);
    const effectiveCategory = normalizeCategory(t.category, t.merchant_name || '');
    if (t.type === 'credit') {
      totalIncome += amt;
    } else {
      totalExpenses += amt;
      spendingByCategory[effectiveCategory] = (spendingByCategory[effectiveCategory] || 0) + amt;
    }
  });

  const netCashFlow = totalIncome - totalExpenses;

  const goalsSummary = (goals || []).map(g => ({
    id:           g.id,
    title:        g.title,
    progress_pct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
    is_feasible:  g.is_feasible,
  }));

  // Emergency Fund is strictly 5% of profile monthly income.
  // We use the stored allocation record if available, otherwise calculate on the fly.
  const emergencyFund = (profile?.monthly_income || 0) * 0.05;

  return res.json({
    net_cash_flow_this_month:  netCashFlow,
    total_income_this_month:   totalIncome,
    total_expenses_this_month: totalExpenses,
    goals_summary:             goalsSummary,
    wealth_this_month: {
      ring_fenced: wealthThisMonth?.ring_fenced_amount || emergencyFund,
      static:      wealthThisMonth?.static_saving || 0,
      dynamic:     wealthThisMonth?.dynamic_saving || 0,
    },
    spending_by_category: Object.entries(spendingByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a,b) => b.amount - a.amount),
    spending_trend: spendingTrend,
    tier:  profile?.tier || 'bronze',
    coins: profile?.coins || 0,
  });
});

module.exports = router;
