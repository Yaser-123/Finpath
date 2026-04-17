const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { buildSystemInstruction, runAgentChat } = require('../lib/gemini');
const { tools, executeTool } = require('../services/chatTools');

/**
 * POST /api/v1/chat
 * Body: { message: string, conversation_history: [] }
 */
router.post('/', authenticate, async (req, res) => {
  const { message, conversation_history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const userId = req.user.id;

  try {
    // 1. Gather minimal context for the system instruction
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [ { data: profile }, { data: goals }, { data: txns } ] = await Promise.all([
      supabase.from('profiles').select('monthly_income,occupation').eq('id', userId).single(),
      supabase.from('goals').select('id').eq('user_id', userId).neq('status', 'abandoned'),
      supabase.from('transactions').select('type,amount').eq('user_id', userId).gte('transaction_date', startOfMonth)
    ]);

    const totalIncome = (txns || [])
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenses = (txns || [])
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const sysInstruct = buildSystemInstruction({
      monthly_income: profile?.monthly_income || 0,
      net_cash_flow: totalIncome - totalExpenses,
      occupation: profile?.occupation || 'salaried',
      goals: goals || []
    });

    // 2. Run the agentic chat loop
    const reply = await runAgentChat({
      userId,
      history: conversation_history,
      message,
      tools,
      executeTool,
      systemInstruction: sysInstruct
    });

    // We no longer return 'action_taken' explicitly as the agent handles it internally.
    // However, the app might expect it for UI hints. 
    // For now, we return a clean response.
    return res.json({ reply });

  } catch (err) {
    console.error('[chat] Agent failed:', err);
    return res.status(500).json({ 
      reply: "I'm having trouble connecting to my financial tools right now. Please try again in a moment.",
      error: err.message 
    });
  }
});

module.exports = router;
