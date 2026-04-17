const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEFAULT_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter(Boolean);

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
  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  let text = '';
  let lastError;

  for (const modelName of DEFAULT_MODELS) {
    try {
      const model = getModel(modelName);
      const result = await model.generateContent(fullPrompt);
      text = result.response.text().trim();
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] model ${modelName} failed: ${err.message}`);
    }
  }

  if (!text) {
    throw new Error(lastError?.message || 'All Gemini model attempts failed');
  }

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
