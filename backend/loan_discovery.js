/**
 * Loan Discovery Engine (Auto-Discovery Service)
 * Runs weekly. Searches for new Indian fintech loan products,
 * uses Gemini AI to extract structured data, and upserts into Supabase.
 *
 * Required env vars:
 *   SERPER_API_KEY  — https://serper.dev (2500 free searches/month)
 *   GEMINI_API_KEY  — https://aistudio.google.com/apikey (free)
 */

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iqimfntocrsjgsfvrcbr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xj3-9XHFo4FvnI04Jx4vXQ_b0STQD6B';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SEARCH_QUERIES = [
    'new Indian fintech instant personal loan 2025 NBFC eligibility interest rate',
    'best instant loan app India 2025 low credit score RBI registered',
    'new MSME business loan India fintech 2025 min score',
    'best personal loan India 2025 low interest rate instant approval'
];

// ─────────────────────────────────────────────
// Step 1: Search the web via Serper.dev
// ─────────────────────────────────────────────
async function searchForLoans(query) {
    if (!SERPER_API_KEY) {
        console.warn('⚠️  SERPER_API_KEY not set. Set it in .env to enable auto-discovery.');
        return [];
    }

    try {
        const response = await axios.post(
            'https://google.serper.dev/search',
            { q: query, num: 10, gl: 'in', hl: 'en' },
            { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } }
        );

        return response.data.organic?.map(r => ({
            title: r.title,
            snippet: r.snippet,
            link: r.link
        })) || [];
    } catch (err) {
        console.error('Search error:', err.message);
        return [];
    }
}

// ─────────────────────────────────────────────
// Step 2: Extract structured loan data with Gemini
// ─────────────────────────────────────────────
async function extractLoanProducts(searchResults) {
    if (!GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY not set. Set it in .env to enable AI extraction.');
        return [];
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const searchContext = searchResults
        .map(r => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`)
        .join('\n\n');

    const prompt = `
You are a fintech data extraction expert. Based on the following web search results about Indian loan products, 
extract loan product details and return a valid JSON array.

RULES:
- Only include real, legitimate Indian loan products from RBI-registered banks or NBFCs
- Only include products where you can determine a minimum credit score requirement
- Do NOT include insurance, credit cards, or EMI schemes
- Each product must have: name, provider, min_score, max_amount, interest_rate, tenure, link, tag, description
- min_score should be an integer (e.g., 650)
- Infer credit score requirements from descriptions like "good credit", "CIBIL 750+", etc.
- Keep descriptions under 150 characters
- Return ONLY the JSON array, no other text

Search Results:
${searchContext}

Return format (JSON array only):
[
  {
    "name": "Product Name",
    "provider": "Lender Name (NBFC/Bank)",
    "min_score": 650,
    "max_amount": "₹10,00,000",
    "interest_rate": "12% p.a. onwards",
    "tenure": "6 – 48 months",
    "link": "https://...",
    "tag": "New Arrival",
    "description": "Brief description under 150 chars."
  }
]
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        const products = JSON.parse(jsonMatch[0]);
        return Array.isArray(products) ? products : [];
    } catch (err) {
        console.error('Gemini extraction error:', err.message);
        return [];
    }
}

// ─────────────────────────────────────────────
// Step 3: Deduplicate against the DB
// ─────────────────────────────────────────────
async function getExistingProviders() {
    const { data } = await supabase.from('loan_products').select('provider, name');
    return new Set(
        (data || []).map(p => `${p.name.toLowerCase().trim()}::${p.provider.toLowerCase().trim()}`)
    );
}

// ─────────────────────────────────────────────
// Step 4: Upsert new products
// ─────────────────────────────────────────────
async function saveDiscoveredLoans(products, existingSet) {
    const newProducts = products.filter(p => {
        const key = `${p.name.toLowerCase().trim()}::${p.provider.toLowerCase().trim()}`;
        return !existingSet.has(key)
            && p.name && p.provider && p.link
            && typeof p.min_score === 'number';
    });

    if (newProducts.length === 0) {
        console.log('📋 No new loan products found this cycle.');
        return 0;
    }

    const rows = newProducts.map((p, i) => ({
        id: `DISC_${Date.now()}_${i}`,
        name: p.name,
        provider: p.provider,
        min_score: p.min_score,
        max_amount: p.max_amount || '—',
        interest_rate: p.interest_rate || '—',
        tenure: p.tenure || '—',
        link: p.link,
        tag: p.tag || 'New Arrival',
        description: p.description || '',
        active: true
    }));

    const { error } = await supabase.from('loan_products').insert(rows);
    if (error) {
        console.error('💥 Error saving discovered loans:', error.message);
        return 0;
    }

    console.log(`✅ Discovered & saved ${rows.length} new loan products:`);
    rows.forEach(r => console.log(`   • ${r.name} by ${r.provider} (min score: ${r.min_score})`));
    return rows.length;
}

// ─────────────────────────────────────────────
// Main Discovery Run
// ─────────────────────────────────────────────
async function runDiscovery() {
    console.log('\n🔍 Loan Discovery Engine — Starting weekly run...');
    const startTime = Date.now();

    try {
        const existingSet = await getExistingProviders();
        let allExtracted = [];

        for (const query of SEARCH_QUERIES) {
            console.log(`   🌐 Searching: "${query}"`);
            const results = await searchForLoans(query);
            if (results.length === 0) continue;

            const extracted = await extractLoanProducts(results);
            allExtracted = [...allExtracted, ...extracted];

            // Throttle to avoid rate limits
            await new Promise(r => setTimeout(r, 1500));
        }

        const saved = await saveDiscoveredLoans(allExtracted, existingSet);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Discovery complete in ${elapsed}s — ${saved} new products added to marketplace.\n`);
    } catch (err) {
        console.error('💥 Discovery Engine Error:', err.message);
    }
}

module.exports = { runDiscovery };
