const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');

/**
 * GET /api/v1/wealth/summary
 */
router.get('/summary', authenticate, async (req, res) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Fetch allocation and profile in parallel
  const [allocationRes, profileRes] = await Promise.all([
    supabase.from('wealth_allocations').select('*').eq('user_id', req.user.id).eq('month', month).single(),
    supabase.from('profiles').select('monthly_income').eq('id', req.user.id).single()
  ]);

  const allocation = allocationRes.data || {};
  const income = Number(profileRes.data?.monthly_income || 0);
  
  // Emergency Fund is strictly 5% of monthly income from profile
  const emergencyFund = income * 0.05;

  return res.json({
    month,
    total_income: income,
    emergency_fund: emergencyFund,
    fd_savings: allocation.static_saving || 0,
    dynamic_saving: allocation.dynamic_saving || 0,
    notes: allocation.notes || "Emergency Fund is 5% of your income. FD settings can be updated manually."
  });
});

/**
 * POST /api/v1/wealth/configure
 * Body: { fd_amount, total_income }
 */
router.post('/configure', authenticate, async (req, res) => {
  const { fd_amount, total_income } = req.body;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Income source priority: body -> profile
  let income = Number(total_income);
  if (!income) {
    const { data: profile } = await supabase.from('profiles').select('monthly_income').eq('id', req.user.id).single();
    income = Number(profile?.monthly_income || 0);
  }

  const emergencyFund = income * 0.05;
  const fdSavings     = Number(fd_amount || 0);
  
  // Remaining goes to dynamic (simplistic model)
  const dynamicSaving = Math.max(0, income - emergencyFund - fdSavings);

  // Upsert allocation record
  const { data, error } = await supabase
    .from('wealth_allocations')
    .upsert({
      user_id:           req.user.id,
      month,
      total_income:      income,
      ring_fenced_amount: emergencyFund,
      static_saving:     fdSavings,
      dynamic_saving:    dynamicSaving,
      notes:             `✅ Emergency Fund (5%) & FD Savings updated. Static cash loses value; FD is safer but consider dynamic growth.`,
    }, { onConflict: 'user_id,month' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  
  return res.json({
    ...data,
    emergency_fund: emergencyFund, // Map table fields to new concept names for the response
    fd_savings: fdSavings
  });
});

/**
 * GET /api/v1/wealth/history
 */
router.get('/history', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('wealth_allocations')
    .select('*')
    .eq('user_id', req.user.id)
    .order('month', { ascending: false })
    .limit(12);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

module.exports = router;
