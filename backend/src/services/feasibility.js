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
 * Logic-based feasibility analyser.
 * Uses deterministic math to save AI credits and prevent data-skew errors.
 */
async function analyseFeasibility({ userId, targetAmount, timeframeMonths, ringFencePct = 20, userProfile = {} }) {
  // 1. Get avg monthly cash flow
  const avgMonthlyNetFlow = await getAvgMonthlyCashFlow(userId, 3);
  const declaredIncome = parseFloat(userProfile.monthly_income || 0);

  // 2. Sanity check: If skewed data (avg flow > 1.5x declared income), trust declared income.
  let baseFlow = declaredIncome;
  if (avgMonthlyNetFlow > 0 && avgMonthlyNetFlow <= (declaredIncome * 1.5)) {
    baseFlow = Math.max(avgMonthlyNetFlow, declaredIncome);
  }

  // 3. Calculate actual available savings (assuming ~40% for essential expenses if income is low, or basic 50/30/20 rule)
  // available = baseFlow * (1 - ringFence% - 50% expenses)
  const expenseRatio = 0.5; // 50% for living expenses
  const ringFenceRatio = ringFencePct / 100;
  const savingsCapacityPerMonth = baseFlow * (1 - ringFenceRatio - expenseRatio);

  // 4. Deterministic Feasibility
  const requiredMonthlySavings = targetAmount / timeframeMonths;
  const isFeasible = savingsCapacityPerMonth >= requiredMonthlySavings;
  const realisticMonths = savingsCapacityPerMonth > 0 
    ? Math.ceil(targetAmount / savingsCapacityPerMonth) 
    : 0;

  let note = '';
  let steps = [];

  // 5. Logical Timing Suggestions
  if (isFeasible) {
    if (requiredMonthlySavings < (savingsCapacityPerMonth * 0.5) && timeframeMonths > 3) {
      // Goal is very easy, suggest shorter timeframe
      const fastMonths = Math.max(1, Math.ceil(targetAmount / (savingsCapacityPerMonth * 0.8)));
      if (fastMonths < timeframeMonths) {
        note = `Your goal of ₹${targetAmount.toLocaleString('en-IN')} is very much on track! Since you can save up to ₹${Math.round(savingsCapacityPerMonth).toLocaleString('en-IN')}/month, you could actually achieve this in ${fastMonths} months instead of ${timeframeMonths}.`;
      } else {
        note = `Great news! You can comfortably save ₹${targetAmount.toLocaleString('en-IN')} in ${timeframeMonths} months.`;
      }
    } else {
      note = `Your goal of ₹${targetAmount.toLocaleString('en-IN')} in ${timeframeMonths} months is feasible. You'll need to set aside about ₹${Math.round(requiredMonthlySavings).toLocaleString('en-IN')} monthly.`;
    }

    steps = [
      { title: "Automate Savings", action: `Move ₹${Math.round(requiredMonthlySavings)} to your FD/Savings account at the start of every month.`, monthly_amount: Math.round(requiredMonthlySavings) },
      { title: "Track Expenses", action: "Review your 'Food' and 'Shopping' categories weekly to ensure you stay within your budget.", monthly_amount: 0 },
      { title: "Wealth Protection", action: `Keep the 5% Emergency Fund (₹${Math.round(baseFlow * 0.05)}) untouched for true emergencies.`, monthly_amount: 0 }
    ];
  } else {
    if (savingsCapacityPerMonth <= 0) {
      note = `Currently, your income (₹${declaredIncome}) doesn't leave enough room for this ₹${targetAmount.toLocaleString('en-IN')} goal after accounting for expenses. Try increasing your income or reducing fixed costs.`;
    } else {
      note = `Saving ₹${targetAmount.toLocaleString('en-IN')} in ${timeframeMonths} months is quite tight for your current income. A more realistic timeframe would be ${realisticMonths} months, saving ₹${Math.round(savingsCapacityPerMonth)} per month.`;
    }

    steps = [
      { title: "Extend Timeframe", action: `Change your target to ${realisticMonths} months to make the monthly contribution manageable.`, monthly_amount: Math.round(savingsCapacityPerMonth) },
      { title: "Income Boost", action: "Consider a side hustle to increase your monthly investable surplus by ₹10,000.", monthly_amount: 0 },
      { title: "Reduce Target", action: `Scale down the goal to ₹${Math.round(savingsCapacityPerMonth * timeframeMonths)} to hit it in your original 8-month window.`, monthly_amount: 0 }
    ];
  }

  // 6. Optional: Use Gemini only to "Polished" the note if needed, but for now we use the deterministic one to save credits.
  // We'll skip Gemini entirely to satisfy "dont use Gemini to evaluate the Timing" and save credits.

  return {
    is_feasible:                isFeasible,
    feasibility_note:           note,
    suggested_timeframe_months: isFeasible ? (note.includes('instead of') ? Math.ceil(targetAmount / (savingsCapacityPerMonth * 0.8)) : null) : realisticMonths,
    steps:                      steps,
    _debug: {
      avg_monthly_net_flow:  avgMonthlyNetFlow,
      base_flow_used:        baseFlow,
      savings_capacity:      savingsCapacityPerMonth,
      required_savings:      requiredMonthlySavings,
    }
  };
}

module.exports = { analyseFeasibility, getAvgMonthlyCashFlow };
