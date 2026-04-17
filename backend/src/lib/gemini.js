const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Get a Gemini model instance.
 * @param {string} [modelName] - Override the default model name.
 */
function getModel(modelName) {
  return genAI.getGenerativeModel({ model: modelName || process.env.GEMINI_MODEL });
}

/**
 * Build the standard FinPath AI system instruction with user context.
 * @param {object} userContext - { monthly_income, net_cash_flow, goals, occupation }
 */
function buildSystemInstruction(userContext = {}) {
  const { monthly_income = 0, net_cash_flow = 0, goals = [], occupation = 'salaried' } = userContext;
  return `You are FinPath AI, a personal finance assistant for Indian users.
User context: monthly income ₹${monthly_income}, net cash flow ₹${net_cash_flow}, occupation: ${occupation}, active goals: ${goals.length}.
Be direct, honest, and specific to the Indian financial context (INR, NSE/BSE, Indian banks, Indian gig platforms).
Never give fake hope — if a goal is not achievable in the given timeframe, say so clearly and suggest a realistic alternative.
Always respond in English. For monetary values always use ₹ symbol.`;
}

/**
 * Run a Gemini prompt with a system instruction.
 */
async function generateContent(prompt, systemInstruction = '', parseJSON = false) {
  const model = getModel();
  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text().trim();

  if (parseJSON) {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  }
  return text;
}

module.exports = { getModel, buildSystemInstruction, generateContent };
