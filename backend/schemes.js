const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Fetch government schemes based on user profile
 */
async function fetchSchemes({ score, netBalance, transactionCount }) {
    if (!SERPER_API_KEY) {
        console.warn('⚠️  SERPER_API_KEY not set.');
        return { schemes: [] };
    }

    // 1. Dynamic Query Generation
    const queries = [
        'government schemes for small business India 2025',
        'MSME schemes India eligibility'
    ];

    if (netBalance < 1000) {
        queries.push('low income support schemes India government');
        queries.push('subsidy programs for poor India 2025');
    }

    if (score > 650) {
        queries.push('business expansion schemes India MSME');
        queries.push('Mudra loan eligibility India 2025');
    }

    if (transactionCount > 15) {
        queries.push('government benefits for UPI active merchants India');
    }

    try {
        // 2. Search (Parallel)
        const searchPromises = queries.map(query => 
            axios.post(
                'https://google.serper.dev/search',
                { q: query, num: 5, gl: 'in', hl: 'en' },
                { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } }
            )
        );

        const responses = await Promise.all(searchPromises);
        let allResults = [];
        responses.forEach(res => {
            const items = res.data.organic?.map(r => ({
                title: r.title,
                description: r.snippet,
                link: r.link
            })) || [];
            allResults = [...allResults, ...items];
        });

        // 3. JS Filtering (Basic)
        const keywords = ['scheme', 'loan', 'msme', 'subsidy', 'government', 'mudra', 'pmyuvak', 'pmsvanidhi'];
        const filtered = allResults.filter(r => 
            keywords.some(k => r.title.toLowerCase().includes(k) || r.description.toLowerCase().includes(k))
        );

        // 4. Gemini Personalization & Categorization (Top 5)
        if (!GEMINI_API_KEY || filtered.length === 0) {
            return { schemes: filtered.slice(0, 5).map(s => ({ ...s, category: 'Scheme' })) };
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const prompt = `
            You are a government policy expert. Below are search results for Indian government schemes.
            USER PROFILE: Score: ${score}, Net Balance: ${netBalance}, Transactions: ${transactionCount}.
            
            TASK: 
            1. Select the TOP 5 most relevant schemes for this user.
            2. Assign a category to each: "Subsidy", "Loan", or "Registration".
            3. Return as a clean JSON array with fields: title, description, link, category.
            4. If a scheme is extremely relevant (e.g. Mudra for high score), set "recommended": true.
            
            SEARCH RESULTS:
            ${JSON.stringify(filtered.slice(0, 15))}
            
            RETURN ONLY THE JSON ARRAY.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const schemes = JSON.parse(jsonMatch[0]);
            return { schemes: schemes.slice(0, 5) };
        }

        return { schemes: filtered.slice(0, 5).map(s => ({ ...s, category: 'Scheme' })) };

    } catch (err) {
        console.error('Scheme discovery error:', err.message);
        return { schemes: [] };
    }
}

module.exports = { fetchSchemes };
