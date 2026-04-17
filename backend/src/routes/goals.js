const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { analyseFeasibility } = require('../services/feasibility');

// Derive goal type from timeframe
function goalType(months) {
  if (months <= 3)  return 'short';
  if (months <= 12) return 'medium';
  return 'long';
}

/**
 * GET /api/v1/goals
 */
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', req.user.id)
    .neq('status', 'abandoned')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

/**
 * POST /api/v1/goals
 * Creates a goal and runs feasibility analysis immediately.
 */
router.post('/', authenticate, async (req, res) => {
  const { title, target_amount, timeframe_months } = req.body;

  if (!title || !target_amount || !timeframe_months) {
    return res.status(400).json({ error: 'title, target_amount, and timeframe_months are required' });
  }

  // Fetch user profile for ring-fence %
  const { data: profile } = await supabase
    .from('profiles')
    .select('monthly_income, wealth_ring_fence_pct, occupation, full_name')
    .eq('id', req.user.id)
    .single();

  const feasibility = await analyseFeasibility({
    userId:          req.user.id,
    targetAmount:    parseFloat(target_amount),
    timeframeMonths: parseInt(timeframe_months),
    ringFencePct:    profile?.wealth_ring_fence_pct || 20,
    userProfile:     profile || {},
  });

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id:                    req.user.id,
      title,
      target_amount:              parseFloat(target_amount),
      timeframe_months:           parseInt(timeframe_months),
      type:                       goalType(parseInt(timeframe_months)),
      is_feasible:                feasibility.is_feasible,
      feasibility_note:           feasibility.feasibility_note,
      suggested_timeframe_months: feasibility.suggested_timeframe_months,
      steps:                      feasibility.steps,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ...data, feasibility_debug: feasibility._debug });
});

/**
 * POST /api/v1/goals/analyse
 * Standalone feasibility analysis without creating a goal.
 */
router.post('/analyse', authenticate, async (req, res) => {
  const { target_amount, timeframe_months } = req.body;

  if (!target_amount || !timeframe_months) {
    return res.status(400).json({ error: 'target_amount and timeframe_months are required' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('monthly_income, wealth_ring_fence_pct, occupation')
    .eq('id', req.user.id)
    .single();

  const result = await analyseFeasibility({
    userId:          req.user.id,
    targetAmount:    parseFloat(target_amount),
    timeframeMonths: parseInt(timeframe_months),
    ringFencePct:    profile?.wealth_ring_fence_pct || 20,
    userProfile:     profile || {},
  });

  return res.json(result);
});

/**
 * PUT /api/v1/goals/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  const allowed = ['title', 'target_amount', 'timeframe_months', 'current_amount', 'status'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

/**
 * DELETE /api/v1/goals/:id  — soft delete
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { error } = await supabase
    .from('goals')
    .update({ status: 'abandoned' })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

/**
 * GET /api/v1/goals/:id/steps
 */
router.get('/:id/steps', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('goals')
    .select('steps, title, target_amount, timeframe_months, is_feasible')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Goal not found' });
  return res.json(data);
});

/**
 * POST /api/v1/goals/:id/progress
 * Body: { amount }
 */
router.post('/:id/progress', authenticate, async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });

  // Fetch current
  const { data: goal } = await supabase
    .from('goals')
    .select('current_amount, target_amount')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const newCurrent = parseFloat(goal.current_amount) + parseFloat(amount);
  const newStatus  = newCurrent >= goal.target_amount ? 'completed' : 'active';

  const { data, error } = await supabase
    .from('goals')
    .update({ current_amount: newCurrent, status: newStatus })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

module.exports = router;
