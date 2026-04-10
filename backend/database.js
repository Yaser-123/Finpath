const { createClient } = require('@supabase/supabase-js');

// Config - In a real app, use process.env
const SUPABASE_URL = 'https://iqimfntocrsjgsfvrcbr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xj3-9XHFo4FvnI04Jx4vXQ_b0STQD6B';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Saves a batch of parsed transactions to Supabase.
 */
async function saveTransactions(messagesWithParsed) {
    const rows = messagesWithParsed
        .filter(item => item.parsed !== null)
        .map(item => ({
            amount: item.parsed.amount,
            type: item.parsed.type,
            merchant: item.parsed.merchant,
            date: new Date().toISOString(), // Use real date if available in valid format
            raw_message: item.raw
        }));

    if (rows.length === 0) return;

    const { error } = await supabase
        .from('transactions')
        .insert(rows);

    if (error) console.error('Error saving transactions to Supabase:', error.message);
}

/**
 * Saves a calculated score to Supabase.
 */
async function saveScore(scoreData) {
    const { error } = await supabase
        .from('scores')
        .insert([{
            score: scoreData.score,
            risk: scoreData.risk,
            total_credit: scoreData.features.totalCredit,
            total_debit: scoreData.features.totalDebit,
            transaction_count: scoreData.features.transactionCount
        }]);

    if (error) console.error('Error saving score to Supabase:', error.message);
}

/**
 * Fetches transaction history and latest score.
 */
async function getHistory() {
    const { data: transactions, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

    const { data: scores, error: sError } = await supabase
        .from('scores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (tError || sError) {
        console.error('Error fetching history:', tError?.message || sError?.message);
        return { transactions: [], latestScore: null };
    }

    return {
        transactions: transactions || [],
        latestScore: scores && scores.length > 0 ? scores[0] : null
    };
}

module.exports = {
    saveTransactions,
    saveScore,
    getHistory
};
