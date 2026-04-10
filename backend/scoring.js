/**
 * Scoring Module
 * Implements ML-style scoring, risk classification, and explainability.
 */

function calculateScore(features) {
    if (features.transactionCount === 0) return 300;

    let score = 300;

    // 1. Income Strength (300 points)
    const incomeScore = Math.min(features.totalCredit / 10000, 1) * 300;
    
    // 2. Transaction Frequency (200 points)
    const frequencyScore = Math.min(features.transactionCount / 50, 1) * 200;

    // 3. Stability Score (200 points)
    let stabilityScore = 0;
    if (features.spendingRatio < 0.5) stabilityScore = 200;
    else if (features.spendingRatio < 0.8) stabilityScore = 150;
    else stabilityScore = 80;

    // 4. Net Balance Score (200 points)
    const balanceScore = features.netBalance > 0 ? 200 : 50;

    score += incomeScore + frequencyScore + stabilityScore + balanceScore;

    return Math.min(Math.round(score), 900);
}

function classifyRisk(score) {
    if (score > 700) return "LOW";
    if (score > 500) return "MEDIUM";
    return "HIGH";
}

function generateInsights(features) {
    const insights = {
        income_strength: "Low incoming transaction volume identified",
        spending_behavior: "High spending compared to income",
        activity_level: "Limited transaction activity"
    };

    // Income strength
    if (features.totalCredit > 20000) insights.income_strength = "High and consistent incoming transactions";
    else if (features.totalCredit > 5000) insights.income_strength = "Moderate income flow detected";

    // Spending behavior
    if (features.spendingRatio < 0.4) insights.spending_behavior = "Controlled and healthy spending behavior";
    else if (features.spendingRatio < 0.7) insights.spending_behavior = "Moderate spending within safe limits";
    else insights.spending_behavior = "Risky spending pattern; expenses close to income";

    // Activity level
    if (features.transactionCount > 30) insights.activity_level = "Very active financial profile";
    else if (features.transactionCount > 10) insights.activity_level = "Actively used account";

    return insights;
}

function generateSummary(features, score) {
    if (features.transactionCount === 0) return "Insufficient transaction data to generate a profile.";
    
    if (score > 700) return "Excellent financial health with a strong income-to-expense ratio.";
    if (score > 500) return "Stable financial profile with moderate spending activity.";
    return "Caution: Spending exceeds recommended limits relative to income.";
}

module.exports = { 
    calculateScore, 
    classifyRisk, 
    generateInsights, 
    generateSummary 
};
