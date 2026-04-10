/**
 * Loan Recommendation Engine — Dynamic DB-backed version
 * Products are stored in Supabase loan_products table.
 * Cached for 5 minutes to avoid hammering the DB on every sync.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iqimfntocrsjgsfvrcbr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xj3-9XHFo4FvnI04Jx4vXQ_b0STQD6B';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 5-minute in-memory cache
let loanCache = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchLoanProducts() {
    const now = Date.now();
    if (loanCache && now < cacheExpiry) return loanCache;

    const { data, error } = await supabase
        .from('loan_products')
        .select('*')
        .eq('active', true)
        .order('min_score', { ascending: true });

    if (error) {
        console.error('Failed to fetch loan products from DB:', error.message);
        return loanCache || []; // Return stale cache if available
    }

    loanCache = data || [];
    cacheExpiry = now + CACHE_TTL_MS;
    console.log(`🏦 Loan cache refreshed: ${loanCache.length} active products loaded.`);
    return loanCache;
}

/**
 * Returns all active loan products with eligibility state for a given score.
 * Eligible products are shown first.
 */
async function getLoans(score) {
    const products = await fetchLoanProducts();

    const scored = products.map(loan => {
        const isEligible = score >= loan.min_score;
        return {
            id:           loan.id,
            name:         loan.name,
            provider:     loan.provider,
            minScore:     loan.min_score,
            maxAmount:    loan.max_amount,
            interestRate: loan.interest_rate,
            tenure:       loan.tenure,
            link:         loan.link,
            tag:          loan.tag,
            description:  loan.description,
            eligible:     isEligible,
            pointsToUnlock: isEligible ? 0 : (loan.min_score - score)
        };
    });

    // Eligible first, then unlockable sorted by fewest points needed
    return scored.sort((a, b) => {
        if (a.eligible && !b.eligible) return -1;
        if (!a.eligible && b.eligible) return 1;
        return a.pointsToUnlock - b.pointsToUnlock;
    });
}

/** Bust the cache (call after a discovery run adds new products) */
function bustLoanCache() {
    loanCache = null;
    cacheExpiry = 0;
}

module.exports = { getLoans, bustLoanCache };
