const { supabase } = require('../lib/supabase');
const { normalizeCategory } = require('../services/category');

/**
 * tool definitions for Gemini
 */
const tools = [
  {
    name: "get_financial_summary",
    description: "Fetch a high-level summary of the user's financial state, including net cash flow, total income/expenses this month, wealth (FD and Emergency Fund), and active goals.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "list_transactions",
    description: "Search or list recent transactions with optional filters for category and transaction type.",
    parameters: {
      type: "OBJECT",
      properties: {
        category: { type: "STRING", description: "Filter by category (e.g., Food, Transport, Shopping)" },
        type: { type: "STRING", enum: ["debit", "credit"], description: "Filter by debit (expense) or credit (income)" },
        limit: { type: "NUMBER", description: "Number of transactions to return (default 10, max 50)" }
      },
    },
  },
  {
    name: "add_transaction",
    description: "Manually log a new transaction (spent or received money).",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: { type: "NUMBER", description: "The transaction amount in INR" },
        type: { type: "STRING", enum: ["debit", "credit"], description: "Whether money was spent (debit) or received (credit)" },
        merchant_name: { type: "STRING", description: "Where the money was spent or from whom it was received" },
        category: { type: "STRING", description: "Spending category (e.g. Food, Travel, Rent, Bills, Salary)" }
      },
      required: ["amount", "type", "merchant_name"]
    },
  },
  {
    name: "update_user_profile",
    description: "Update the user's global financial profile details like monthly income or occupation.",
    parameters: {
      type: "OBJECT",
      properties: {
        monthly_income: { type: "NUMBER", description: "The user's official monthly income" },
        occupation: { type: "STRING", description: "The user's professional occupation (e.g. Software Engineer, Student)" }
      }
    },
  },
  {
    name: "upsert_wealth_allocation",
    description: "Update or configure wealth allocation for the current month, specifically FD Savings or total investable income.",
    parameters: {
      type: "OBJECT",
      properties: {
        fd_amount: { type: "NUMBER", description: "The manual amount to store in FD (Fixed Deposit) Savings" },
        total_income: { type: "NUMBER", description: "Optional: override the total income for wealth calculation" }
      }
    },
  },
  {
    name: "manage_financial_goal",
    description: "Create or update a financial goal (e.g., saving for a vacation or car).",
    parameters: {
      type: "OBJECT",
      properties: {
        action: { type: "STRING", enum: ["create", "update"], description: "Whether to create a new goal or update progress on an existing one" },
        title: { type: "STRING", description: "The name of the goal" },
        target_amount: { type: "NUMBER", description: "The total target amount for the goal" },
        current_amount: { type: "NUMBER", description: "For updates: the new current progress amount" },
        timeframe_months: { type: "NUMBER", description: "Duration of the goal in months" }
      },
      required: ["action", "title"]
    },
  }
];

/**
 * Implementation of tools
 */
async function executeTool(userId, name, args) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  switch (name) {
    case "get_financial_summary": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const [ { data: profile }, { data: wealth }, { data: txns }, { data: goals } ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('wealth_allocations').select('*').eq('user_id', userId).eq('month', currentMonth).single(),
        supabase.from('transactions').select('type,amount').eq('user_id', userId).gte('transaction_date', startOfMonth),
        supabase.from('goals').select('title,target_amount,current_amount').eq('user_id', userId).neq('status', 'abandoned')
      ]);

      const totalIncome = (txns || [])
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalExpenses = (txns || [])
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        profile: {
          monthly_income: profile?.monthly_income || 0,
          occupation: profile?.occupation || 'unknown',
          tier: profile?.tier || 'bronze'
        },
        wealth: {
          emergency_fund: wealth?.ring_fenced_amount || (profile?.monthly_income || 0) * 0.05,
          fd_savings: wealth?.static_saving || 0,
          dynamic_investments: wealth?.dynamic_saving || 0
        },
        monthly_stats: {
          income_this_month: totalIncome,
          expenses_this_month: totalExpenses,
          net_cash_flow: totalIncome - totalExpenses
        },
        goals: goals || []
      };
    }

    case "list_transactions": {
      let query = supabase.from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (args.category) query = query.eq('category', args.category);
      if (args.type) query = query.eq('type', args.type);
      query = query.limit(args.limit || 10);

      const { data, error } = await query;
      if (error) return { error: error.message };
      return data;
    }

    case "add_transaction": {
      const category = args.category || normalizeCategory('Chat', args.merchant_name);
      const { data, error } = await supabase.from('transactions').insert({
        user_id: userId,
        amount: args.amount,
        type: args.type,
        merchant_name: args.merchant_name,
        category,
        source: 'chat',
        transaction_date: now.toISOString()
      }).select().single();

      if (error) return { error: error.message };
      return { status: "success", transaction: data };
    }

    case "update_user_profile": {
      const updates = {};
      if (args.monthly_income !== undefined) updates.monthly_income = args.monthly_income;
      if (args.occupation !== undefined) updates.occupation = args.occupation;

      const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
      if (error) return { error: error.message };
      return { status: "success", profile: data };
    }

    case "upsert_wealth_allocation": {
      // Logic copied from wealth.js to maintain consistency
      const { data: profile } = await supabase.from('profiles').select('monthly_income').eq('id', userId).single();
      const income = Number(args.total_income || profile?.monthly_income || 0);
      const emergencyFund = income * 0.05;
      const fdSavings = Number(args.fd_amount || 0);
      const dynamicSaving = Math.max(0, income - emergencyFund - fdSavings);

      const { data, error } = await supabase
        .from('wealth_allocations')
        .upsert({
          user_id: userId,
          month: currentMonth,
          total_income: income,
          ring_fenced_amount: emergencyFund,
          static_saving: fdSavings,
          dynamic_saving: dynamicSaving,
          notes: "Updated via FinPath Chat Agent"
        }, { onConflict: 'user_id,month' })
        .select().single();

      if (error) return { error: error.message };
      return { status: "success", wealth: data, emergency_fund: emergencyFund };
    }

    case "manage_financial_goal": {
      if (args.action === "create") {
        const { data, error } = await supabase.from('goals').insert({
          user_id: userId,
          title: args.title,
          target_amount: args.target_amount,
          timeframe_months: args.timeframe_months || 12,
          current_amount: 0,
          status: 'active',
          type: (args.timeframe_months || 12) <= 12 ? 'medium' : 'long'
        }).select().single();
        if (error) return { error: error.message };
        return { status: "success", goal: data };
      } else {
        const { data, error } = await supabase.from('goals').update({
          current_amount: args.current_amount
        }).eq('user_id', userId).eq('title', args.title).select().single();
        if (error) return { error: error.message };
        return { status: "success", goal: data };
      }
    }

    default:
      return { error: `Tool ${name} not implemented.` };
  }
}

module.exports = { tools, executeTool };
