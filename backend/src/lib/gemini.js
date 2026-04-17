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
 * @param {object[]} [tools] - Optional tool definitions.
 */
function getModel(modelName, tools = []) {
  const config = { model: modelName || process.env.GEMINI_MODEL };
  if (tools.length > 0) {
    config.tools = [{ functionDeclarations: tools }];
  }
  return genAI.getGenerativeModel(config);
}

/**
 * Build the standard FinPath AI system instruction with user context.
 * @param {object} userContext - { monthly_income, net_cash_flow, goals, occupation }
 */
function buildSystemInstruction(userContext = {}) {
  const { monthly_income = 0, net_cash_flow = 0, goals = [], occupation = 'salaried' } = userContext;
  return `You are FinPath AI, a personal finance assistant for Indian users.
User Financial Snapshot:
- Monthly Income: ₹${monthly_income}
- Net Cash Flow: ₹${net_cash_flow}
- Occupation: ${occupation}
- Active Goals: ${goals.length}

You have access to REAL financial tools to query and update the user's data. 
Be direct, honest, and specific to the Indian context (INR, NSE/BSE).
If a user asks to change a value, log an expense, or list their spending, use your tools first then summarize what you did.
Always respond in English. For monetary values always use ₹ symbol.
Current Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

/**
 * Run a multi-turn agent loop with tool calling.
 */
async function runAgentChat({ userId, history, message, tools, executeTool, systemInstruction }) {
  const model = getModel(process.env.GEMINI_MODEL, tools);
  
  // Transform history into Gemini format
  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  const chat = model.startChat({
    history: contents,
    systemInstruction: { text: systemInstruction }
  });

  let result = await chat.sendMessage(message);
  let response = result.response;

  // Maximum 5 iterations of tool calling to prevent infinite loops
  for (let i = 0; i < 5; i++) {
    const calls = response.functionCalls();
    if (!calls || calls.length === 0) break;

    const toolResponses = await Promise.all(calls.map(async (call) => {
      console.log(`[agent] Executing tool: ${call.name}`, call.args);
      const output = await executeTool(userId, call.name, call.args);
      return {
        functionResponse: {
          name: call.name,
          response: { content: output }
        }
      };
    }));

    result = await chat.sendMessage(toolResponses);
    response = result.response;
  }

  return response.text().trim();
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

module.exports = { getModel, buildSystemInstruction, generateContent, runAgentChat };
