const { supabase } = require('../lib/supabase');
const { generateContent, buildSystemInstruction } = require('../lib/gemini');

/**
 * Fetch average monthly net cash flow for a user over the last N months.
 */
async function getAvgMonthlyCashFlow(userId, months = 3) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('transaction_date', since.toISOString());

  if (error || !data || data.length === 0) return 0;

  let totalCredit = 0;
  let totalDebit  = 0;
  data.forEach(t => {
    if (t.type === 'credit') totalCredit += parseFloat(t.amount);
    else totalDebit += parseFloat(t.amount);
  });

  const netFlow = totalCredit - totalDebit;
  return netFlow / months; // avg monthly net
}

/**
 * Core feasibility analyser.
 * CRITICAL: Never returns is_feasible=true unless math confirms it.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {number} params.targetAmount
 * @param {number} params.timeframeMonths
 * @param {number} params.ringFencePct  - % of income to ring-fence (default 20)
 * @param {object} params.userProfile   - { monthly_income, occupation, full_name }
 */
async function analyseFeasibility({ userId, targetAmount, timeframeMonths, ringFencePct = 20, userProfile = {} }) {
  // 1. Get avg monthly cash flow from last 3 months of transactions
  const avgMonthlyNetFlow = await getAvgMonthlyCashFlow(userId, 3);

  // 2. Fall back to declared income if no transactions yet
  const monthlyIncome = userProfile.monthly_income || 0;
  const baseFlow = avgMonthlyNetFlow > 0 ? avgMonthlyNetFlow : monthlyIncome;

  // 3. Remove ring-fenced wealth portion first
  const ringFenceAmount      = baseFlow * (ringFencePct / 100);
  const availableForGoals    = baseFlow - ringFenceAmount;

  // 4. How much can be saved over the timeframe?
  const maxSaveable = availableForGoals * timeframeMonths;

  const isFeasible = maxSaveable >= targetAmount;

  // 5. Realistic timeframe if not feasible
  const realisticMonths = availableForGoals > 0
    ? Math.ceil(targetAmount / availableForGoals)
    : null;

  // 6. Gemini generates the honest message + step plan
  const sysInstruct = buildSystemInstruction({
    monthly_income: monthlyIncome,
    net_cash_flow:  baseFlow,
    occupation:     userProfile.occupation,
  });

  let geminiOutput = { feasibility_note: '', steps: [] };
  try {
    const prompt = isFeasible
      ? `The user wants to save ₹${targetAmount} in ${timeframeMonths} months.
After ring-fencing ${ringFencePct}% for generational wealth, their available savings capacity is ₹${availableForGoals.toFixed(0)}/month.
This IS feasible (max saveable: ₹${maxSaveable.toFixed(0)}).
Generate a step-by-step savings plan as JSON: {"feasibility_note":"...","steps":[{"title":"...","action":"...","monthly_amount":0}]}
Make the note motivating but realistic. Include 4-6 concrete steps.`
      : `The user wants to save ₹${targetAmount} in ${timeframeMonths} months.
After ring-fencing ${ringFencePct}% for generational wealth, their available savings capacity is ₹${availableForGoals.toFixed(0)}/month.
This is NOT feasible (max saveable in ${timeframeMonths} months: ₹${maxSaveable.toFixed(0)}).
Realistic timeframe: ${realisticMonths || 'unknown'} months.
Generate an honest, compassionate note and alternative plan as JSON: {"feasibility_note":"...","steps":[{"title":"...","action":"...","monthly_amount":0}]}
Be honest — never say the original goal is achievable. Suggest concrete modifications (extend timeframe, reduce target, or increase income).`;

    geminiOutput = await generateContent(prompt, sysInstruct, true);
  } catch (err) {
    geminiOutput.feasibility_note = isFeasible
      ? `You can save ₹${targetAmount} in ${timeframeMonths} months with ₹${availableForGoals.toFixed(0)}/month.`
      : `This goal requires ₹${targetAmount} but you can only save ₹${maxSaveable.toFixed(0)} in ${timeframeMonths} months. Consider ${realisticMonths || 'a longer'} months instead.`;
  }

  return {
    is_feasible:                isFeasible,
    feasibility_note:           geminiOutput.feasibility_note,
    suggested_timeframe_months: isFeasible ? null : realisticMonths,
    steps:                      geminiOutput.steps || [],
    _debug: {
      avg_monthly_net_flow:  baseFlow,
      ring_fence_amount:     ringFenceAmount,
      available_for_goals:   availableForGoals,
      max_saveable:          maxSaveable,
    }
  };
}

module.exports = { analyseFeasibility, getAvgMonthlyCashFlow };
