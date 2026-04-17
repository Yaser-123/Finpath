const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { generateContent, buildSystemInstruction } = require('../lib/gemini');
const { analyseFeasibility } = require('../services/feasibility');

/**
 * POST /api/v1/chat
 * Body: { message: string, conversation_history: [] }
 */
router.post('/', authenticate, async (req, res) => {
  const { message, conversation_history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const userId = req.user.id;

  // Gather user context
  const [{ data: profile }, { data: goals }, { data: recentTxns }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('goals').select('title,target_amount,current_amount,is_feasible').eq('user_id', userId).neq('status', 'abandoned'),
    supabase.from('transactions').select('type,amount,category').eq('user_id', userId).order('transaction_date', { ascending: false }).limit(20),
  ]);

  const sysInstruct = buildSystemInstruction({
    monthly_income: profile?.monthly_income,
    occupation:     profile?.occupation,
    goals:          goals || [],
  });

  // Detect intent for agentic actions
  const lowerMsg = message.toLowerCase();
  let action_taken = null;
  let action_result = null;

  // Intent: create a goal
  if (lowerMsg.includes('set a goal') || lowerMsg.includes('create a goal') || lowerMsg.includes('save for')) {
    const goalPrompt = `System: ${sysInstruct}

The user wants to set a goal. Extract from their message:
Message: "${message}"
Return JSON: {"title":"...","target_amount":0,"timeframe_months":0,"needs_confirmation":true,"confirmation_message":"..."}
If you can't extract all details, set target_amount=0 and include a question in confirmation_message.`;

    try {
      const parsed = await generateContent(goalPrompt, '', true);
      action_taken = 'goal_suggestion';
      action_result = { ...parsed, pending: true };
    } catch (_) {}
  }

  // Intent: update progress
  if (lowerMsg.includes('update my savings') || lowerMsg.includes('added to') || lowerMsg.includes('saved')) {
    action_taken = 'progress_update_prompt';
    action_result = { message: 'Which goal would you like to update? Please specify the goal name and amount.' };
  }

  // Intent: spending summary
  if (lowerMsg.includes('spending') || lowerMsg.includes('expenses') || lowerMsg.includes('spent')) {
    const byCategory = {};
    (recentTxns || []).filter(t => t.type === 'debit').forEach(t => {
      byCategory[t.category || 'other'] = (byCategory[t.category || 'other'] || 0) + parseFloat(t.amount);
    });
    action_taken = 'spending_summary';
    action_result = { spending_by_category: byCategory };
  }

  // Intent: feasibility check
  if (lowerMsg.includes('on track') || lowerMsg.includes('feasible') || lowerMsg.includes('can i achieve')) {
    const activeGoals = (goals || []).filter(g => g.is_feasible !== null);
    action_taken = 'feasibility_summary';
    action_result = { goals: activeGoals.map(g => ({
      title: g.title,
      progress: g.target_amount > 0 ? `${Math.round((g.current_amount / g.target_amount) * 100)}%` : '0%',
      is_feasible: g.is_feasible
    })) };
  }

  // Build conversation prompt with history
  const historyText = conversation_history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
  const contextPrompt = `${sysInstruct}

User financial context:
- Goals: ${(goals || []).map(g => `${g.title} (₹${g.current_amount}/₹${g.target_amount})`).join(', ') || 'none'}
- Action taken this turn: ${action_taken || 'none'}
${action_result ? `- Action data: ${JSON.stringify(action_result)}` : ''}

Conversation history:
${historyText}

User: ${message}

Respond helpfully. If an action was taken, acknowledge it and confirm with the user before executing. Be concise (2-4 sentences). Always respond in English.`;

  try {
    const reply = await generateContent(contextPrompt, '', false);
    return res.json({ reply, action_taken, action_result });
  } catch (err) {
    return res.status(500).json({ error: 'Chat failed', detail: err.message });
  }
});

module.exports = router;
