const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import modular components
const { parseStrictTransaction } = require('./parser');
const { calculateFeatures } = require('./features');
const { calculateScore, classifyRisk, generateInsights, generateSummary } = require('./scoring');
const { saveTransactions, saveScore, getHistory, clearAllData, pruneJunk } = require('./database');
const { getLoans } = require('./loans');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Main Endpoint: POST /api/sms
app.post('/api/sms', async (req, res) => {
    try {
        const rawMessages = req.body.messages;
        if (!rawMessages || !Array.isArray(rawMessages)) {
            return res.status(400).json({ status: 'error', message: 'Invalid request body' });
        }
        
        // 1. Cleanup Junk
        await pruneJunk();

        // 2. Parse Incoming Batch
        const parsedBatch = rawMessages
            .map(msg => ({
                raw: msg.body,
                sender: msg.sender,
                date: msg.date,
                parsed: parseStrictTransaction({ body: msg.body, sender: msg.sender, date: msg.date })
            }))
            .filter(item => item.parsed !== null);

        const currentTransactions = parsedBatch.map(item => ({
            ...item.parsed,
            raw_message: item.raw 
        }));

        // 3. PERSIST - Start the save in the background
        if (currentTransactions.length > 0) {
            await saveTransactions(currentTransactions);
        }

        // 4. IN-MEMORY MERGER (Definitive Resolution)
        // Fetch history but manually combine it with the current batch 
        // to bypass any database consistency/latency issues.
        const historyData = await getHistory();
        const existingHistory = historyData.transactions || [];
        
        // Remove duplicates from existing history if they are in the current batch
        const currentRefs = new Set(currentTransactions.map(t => t.reference_number));
        const mergedHistory = [
            ...currentTransactions,
            ...existingHistory.filter(t => !currentRefs.has(t.reference_number))
        ];

        console.log(`📡 Intelligence Engine: Scoring merged set of ${mergedHistory.length} unique transactions.`);

        // 5. Calculate Intelligence (Scoring)
        const features = calculateFeatures(mergedHistory);
        const scoreResult = calculateScore(features);
        const score = scoreResult.total;
        const breakdown = scoreResult.breakdown;
        
        const risk = classifyRisk(score);
        const insights = generateInsights(features);
        const summary = generateSummary(features, score);

        // Trend Analysis
        let scoreChange = 0;
        if (historyData.latestScores.length > 0) {
            scoreChange = score - historyData.latestScores[0].score;
        }

        // 6. Save performance history
        await saveScore({ score, risk, features, breakdown });

        // 7. Response (Fully Hydrated from Merged Reality)
        res.json({
            status: 'success',
            score: score,
            risk: risk,
            scoreChange: scoreChange,
            breakdown: breakdown, 
            summary: summary,
            features: features,
            insights: insights,
            eligibleLoans: getLoans(score)
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// History Endpoint: GET /api/history
app.get('/api/history', async (req, res) => {
    try {
        const historyData = await getHistory();
        const transactions = historyData.transactions;
        const latestScore = historyData.latestScores.length > 0 ? historyData.latestScores[0] : null;

        let dynamicBreakdown = null;
        let dynamicLoans = [];

        if (latestScore) {
            // Recalculate features for the historical set
            const features = calculateFeatures(transactions);
            const scoreResult = calculateScore(features);
            dynamicBreakdown = scoreResult.breakdown;
            dynamicLoans = getLoans(latestScore.score);
        }

        res.json({
            transactions: transactions,
            latestScore: latestScore ? {
                ...latestScore,
                breakdown: dynamicBreakdown,
                eligibleLoans: dynamicLoans
            } : null,
            scoreChange: historyData.latestScores.length >= 2 ? 
                (historyData.latestScores[0].score - historyData.latestScores[1].score) : 0
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch history' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 SMS Fintech Intelligence Engine running on http://localhost:${PORT}`);
});
