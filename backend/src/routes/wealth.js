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

  const { data } = await supabase
    .from('wealth_allocations')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('month', month)
    .single();

  return res.json(data || { month, message: 'No allocation recorded for this month yet.' });
});

/**
 * POST /api/v1/wealth/configure
 * Body: { ring_fence_pct, static_saving_pct, total_income }
 */
router.post('/configure', authenticate, async (req, res) => {
  const { ring_fence_pct, total_income } = req.body;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const ringFenced     = (total_income || 0) * ((ring_fence_pct || 20) / 100);
  const remaining      = (total_income || 0) - ringFenced;
  const staticSaving   = remaining * 0.4;
  const dynamicSaving  = remaining * 0.6;

  // Upsert profile ring-fence setting
  await supabase.from('profiles').update({ wealth_ring_fence_pct: ring_fence_pct || 20 }).eq('id', req.user.id);

  // Upsert allocation record
  const { data, error } = await supabase
    .from('wealth_allocations')
    .upsert({
      user_id:           req.user.id,
      month,
      total_income:      total_income || 0,
      ring_fenced_amount: ringFenced,
      static_saving:     staticSaving,
      dynamic_saving:    dynamicSaving,
      notes:             `⚠️ Cash savings lose value to inflation (~6% per year in India). Consider moving static savings into liquid funds or FDs.`,
    }, { onConflict: 'user_id,month' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
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
