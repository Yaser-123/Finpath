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
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');
      if (objectStart >= 0 && objectEnd > objectStart) {
        const objectCandidate = cleaned.slice(objectStart, objectEnd + 1);
        try {
          return JSON.parse(objectCandidate);
        } catch (_) {
          // continue to array candidate
        }
      }

      const arrayStart = cleaned.indexOf('[');
      const arrayEnd = cleaned.lastIndexOf(']');
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        const arrayCandidate = cleaned.slice(arrayStart, arrayEnd + 1);
        return JSON.parse(arrayCandidate);
      }

      throw new Error('Gemini returned non-JSON output');
    }
  }
  return text;
}

module.exports = { getModel, buildSystemInstruction, generateContent };
