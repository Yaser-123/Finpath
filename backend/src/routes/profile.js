const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');

router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, monthly_income, occupation, wealth_ring_fence_pct, tier, coins')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || {});
});

router.put('/', authenticate, async (req, res) => {
  const updates = {};
  if (req.body.monthly_income !== undefined) {
    const income = Number(req.body.monthly_income);
    if (!Number.isFinite(income) || income < 0) {
      return res.status(400).json({ error: 'monthly_income must be a non-negative number' });
    }
    updates.monthly_income = income;
  }
  if (req.body.occupation !== undefined) {
    updates.occupation = String(req.body.occupation || '').trim() || null;
  }
  if (req.body.wealth_ring_fence_pct !== undefined) {
    const pct = Number(req.body.wealth_ring_fence_pct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'wealth_ring_fence_pct must be between 0 and 100' });
    }
    updates.wealth_ring_fence_pct = pct;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid profile fields provided' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select('id, full_name, monthly_income, occupation, wealth_ring_fence_pct, tier, coins')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

module.exports = router;
