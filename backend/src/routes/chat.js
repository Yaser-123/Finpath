const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { generateContent, buildSystemInstruction } = require('../lib/gemini');
const { inferCategory } = require('../services/category');

function parseIncomeUpdate(message) {
  const lower = (message || '').toLowerCase();
  if (!/(monthly income|salary|income is|my income)/.test(lower)) return null;
  const m = message.match(/(?:₹|rs\.?\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const value = Number(String(m[1]).replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function parseTransactionFromMessage(message) {
  const lower = (message || '').toLowerCase();
  const amountMatch = message.match(/(?:₹|rs\.?\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = Number(String(amountMatch[1]).replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const isDebit = /\b(spent|paid|debited|expense|bought|purchase)\b/.test(lower);
  const isCredit = /\b(received|credited|earned|salary|income)\b/.test(lower);
  if (!isDebit && !isCredit) return null;

  const merchantMatch = message.match(/(?:on|at|to|from)\s+([a-zA-Z0-9&._\- ]{2,40})/i);
  const merchant = merchantMatch?.[1]?.trim() || (isDebit ? 'Chat Expense' : 'Chat Income');
  const category = inferCategory(`${merchant} ${message}`);

  return {
    amount,
    type: isDebit ? 'debit' : 'credit',
    merchant_name: merchant,
    category,
  };
}

function parseGoalFromMessage(message) {
  const lower = (message || '').toLowerCase();
  if (!/(goal|save for|target)/.test(lower)) return null;

  const amountMatch = message.match(/(?:₹|rs\.?\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  const monthsMatch = message.match(/(\d+)\s*(month|months|year|years)/i);
  if (!amountMatch || !monthsMatch) return null;

  const amount = Number(String(amountMatch[1]).replace(/,/g, ''));
  let months = Number(monthsMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(months) || months <= 0) return null;
  if (/year/i.test(monthsMatch[2])) months *= 12;

  const titleMatch = message.match(/(?:goal|save for|target)\s+([a-zA-Z0-9 .,'-]{3,50})/i);
  const title = titleMatch?.[1]?.replace(/\b(in|within)\b.*$/i, '').trim() || 'New Goal';

  return {
    title,
    target_amount: amount,
    timeframe_months: months,
  };
}

function goalType(months) {
  if (months <= 3) return 'short';
  if (months <= 12) return 'medium';
  return 'long';
}

function buildRuleBasedReply(message, actionTaken, actionResult, profile, goals, recentTxns) {
  const lowerMsg = (message || '').toLowerCase();

  if (actionTaken === 'spending_summary' && actionResult?.spending_by_category) {
    const pairs = Object.entries(actionResult.spending_by_category)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat, amt]) => `${cat}: INR ${Math.round(Number(amt || 0))}`);
    if (pairs.length) {
      return `Your top expense buckets are ${pairs.join(' and ')}. Try reducing the highest one by 10-15% this month and track weekly.`;
    }
  }

  if (lowerMsg.includes('goal') || lowerMsg.includes('save')) {
    const activeGoals = (goals || []).slice(0, 2).map((g) => `${g.title} (INR ${Math.round(g.current_amount || 0)}/INR ${Math.round(g.target_amount || 0)})`);
    if (activeGoals.length) {
      return `You are currently tracking ${activeGoals.join(' and ')}. If you share a target date, I can break it into monthly savings milestones.`;
    }
    return 'You do not have an active goal yet. Tell me what you want to save for and by when, and I will draft a practical plan.';
  }

  const debits = (recentTxns || []).filter((t) => t.type === 'debit');
  const credits = (recentTxns || []).filter((t) => t.type === 'credit');
  const debitSum = debits.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const creditSum = credits.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const incomeHint = profile?.monthly_income ? `Your recorded monthly income is INR ${Math.round(profile.monthly_income)}.` : '';

  return `${incomeHint} Based on recent activity, credits are INR ${Math.round(creditSum)} and debits are INR ${Math.round(debitSum)}. Ask me for a spending cap, goal plan, or investment split and I will generate it.`.trim();
}

/**
 * POST /api/v1/chat
 * Body: { message: string, conversation_history: [] }
 */
router.post('/', authenticate, async (req, res) => {
  const { message, conversation_history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const userId = req.user.id;

  // Gather user context
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: profile }, { data: goals }, { data: recentTxns }, { data: monthTxns }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('goals').select('title,target_amount,current_amount,is_feasible').eq('user_id', userId).neq('status', 'abandoned'),
    supabase.from('transactions').select('type,amount,category').eq('user_id', userId).order('transaction_date', { ascending: false }).limit(20),
    supabase.from('transactions').select('type,amount').eq('user_id', userId).gte('transaction_date', monthStart),
  ]);

  const inferredMonthlyIncome = (monthTxns || [])
    .filter((t) => t.type === 'credit')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const effectiveMonthlyIncome = Number(profile?.monthly_income || 0) > 0
    ? Number(profile.monthly_income)
    : inferredMonthlyIncome;

  const sysInstruct = buildSystemInstruction({
    monthly_income: effectiveMonthlyIncome,
    occupation:     profile?.occupation,
    goals:          goals || [],
  });

  // Detect intent for agentic actions
  const lowerMsg = message.toLowerCase();
  let action_taken = null;
  let action_result = null;

  const parsedIncome = parseIncomeUpdate(message);
  if (parsedIncome !== null) {
    const { error } = await supabase.from('profiles').update({ monthly_income: parsedIncome }).eq('id', userId);
    if (!error) {
      action_taken = 'income_updated';
      action_result = { monthly_income: parsedIncome };
    }
  }

  const parsedTxn = parseTransactionFromMessage(message);
  if (parsedTxn && !action_taken) {
    const { data: txnRow, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        source: 'chat',
        ...parsedTxn,
        transaction_date: new Date().toISOString(),
      })
      .select('id, type, amount, category, merchant_name')
      .single();

    if (!error) {
      action_taken = 'transaction_logged';
      action_result = txnRow;
    }
  }

  const parsedGoal = parseGoalFromMessage(message);
  if (parsedGoal && !action_taken) {
    const { data: goalRow, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        ...parsedGoal,
        type: goalType(parsedGoal.timeframe_months),
        current_amount: 0,
        status: 'active',
      })
      .select('id, title, target_amount, timeframe_months')
      .single();

    if (!error) {
      action_taken = 'goal_created';
      action_result = goalRow;
    }
  }

  // Intent: create a goal
  if (!action_taken && (lowerMsg.includes('set a goal') || lowerMsg.includes('create a goal') || lowerMsg.includes('save for'))) {
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
  if (!action_taken && (lowerMsg.includes('update my savings') || lowerMsg.includes('added to') || lowerMsg.includes('saved'))) {
    action_taken = 'progress_update_prompt';
    action_result = { message: 'Which goal would you like to update? Please specify the goal name and amount.' };
  }

  // Intent: spending summary
  if (!action_taken && (lowerMsg.includes('spending') || lowerMsg.includes('expenses') || lowerMsg.includes('spent'))) {
    const byCategory = {};
    (recentTxns || []).filter(t => t.type === 'debit').forEach(t => {
      byCategory[t.category || 'other'] = (byCategory[t.category || 'other'] || 0) + parseFloat(t.amount);
    });
    action_taken = 'spending_summary';
    action_result = { spending_by_category: byCategory };
  }

  // Intent: feasibility check
  if (!action_taken && (lowerMsg.includes('on track') || lowerMsg.includes('feasible') || lowerMsg.includes('can i achieve'))) {
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
    const fallbackReply = buildRuleBasedReply(message, action_taken, action_result, profile, goals, recentTxns);
    return res.json({ reply: fallbackReply, action_taken, action_result, degraded_mode: true });
  }
});

module.exports = router;
