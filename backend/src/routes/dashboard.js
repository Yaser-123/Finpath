const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { normalizeCategory } = require('../services/category');

/**
 * GET /api/v1/dashboard
 */
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Run all queries in parallel
  const [
    { data: txThisMonth },
    { data: goals },
    { data: profile },
    { data: wealthThisMonth },
  ] = await Promise.all([
    supabase.from('transactions').select('type,amount,category,merchant_name').eq('user_id', userId).gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonth),
    supabase.from('goals').select('id,title,target_amount,current_amount,is_feasible').eq('user_id', userId).neq('status', 'abandoned'),
    supabase.from('profiles').select('tier,coins,monthly_income,wealth_ring_fence_pct').eq('id', userId).single(),
    supabase.from('wealth_allocations').select('*').eq('user_id', userId).eq('month', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).single(),
  ]);

  const transactions = txThisMonth || [];
  let totalIncome = 0;
  let totalExpenses = 0;
  const spendingByCategory = {};

  transactions.forEach(t => {
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
  const ringFencePct = profile?.data?.wealth_ring_fence_pct ?? 20;
  const ringFenced = totalIncome * (ringFencePct / 100);

  const goalsSummary = (goals || []).map(g => ({
    id:           g.id,
    title:        g.title,
    progress_pct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
    is_feasible:  g.is_feasible,
  }));

  return res.json({
    net_cash_flow_this_month:  netCashFlow,
    total_income_this_month:   totalIncome,
    total_expenses_this_month: totalExpenses,
    goals_summary:             goalsSummary,
    wealth_this_month: {
      ring_fenced: wealthThisMonth?.data?.ring_fenced_amount ?? ringFenced,
      static:      wealthThisMonth?.data?.static_saving ?? 0,
      dynamic:     wealthThisMonth?.data?.dynamic_saving ?? 0,
    },
    spending_by_category: Object.entries(spendingByCategory).map(([category, amount]) => ({ category, amount })),
    tier:  profile?.data?.tier ?? 'bronze',
    coins: profile?.data?.coins ?? 0,
  });
});

module.exports = router;
