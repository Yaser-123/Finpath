const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { normalizeCategory, isCleanMerchant } = require('../services/category');

/**
 * GET /api/v1/transactions
 * Query params: page, limit, type, category, start_date, end_date
 */
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, type, category, start_date, end_date } = req.query;
  const from = (page - 1) * limit;
  const to = from + parseInt(limit) - 1;

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('transaction_date', { ascending: false })
    .range(from, to);

  if (type)       query = query.eq('type', type);
  if (category)   query = query.eq('category', category);
  if (start_date) query = query.gte('transaction_date', start_date);
  if (end_date)   query = query.lte('transaction_date', end_date);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const normalizedData = (data || [])
    .filter((tx) => tx.source !== 'sms' || isCleanMerchant(tx.merchant_name))
    .map((tx) => ({
      ...tx,
      category: normalizeCategory(tx.category, tx.merchant_name || ''),
    }));

  return res.json({
    data: normalizedData,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
  });
});

/**
 * POST /api/v1/transactions/manual
 * Body: { amount, type, merchant_name, category, transaction_date }
 */
router.post('/manual', authenticate, async (req, res) => {
  const { amount, type, merchant_name, category, transaction_date } = req.body;

  if (!amount || !type) {
    return res.status(400).json({ error: 'amount and type are required' });
  }
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({ error: 'type must be credit or debit' });
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id:          req.user.id,
      source:           'manual',
      type,
      amount:           parseFloat(amount),
      merchant_name:    merchant_name || 'Manual Entry',
      category:         category || 'other',
      transaction_date: transaction_date || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

module.exports = router;
