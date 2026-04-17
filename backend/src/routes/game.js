const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../lib/supabase');
const { generateContent } = require('../lib/gemini');

// Static question bank seed (Gemini will generate more dynamically)
const STATIC_QUESTIONS = [
  {
    id: 'q001',
    question: 'What does SIP stand for in mutual funds?',
    options: ['Systematic Investment Plan', 'Savings Interest Plan', 'Stock Index Plan', 'Secure Income Portfolio'],
    correct_index: 0,
    coins: 5,
  },
  {
    id: 'q002',
    question: 'What is the current GST rate on restaurant bills in India?',
    options: ['5%', '12%', '18%', '28%'],
    correct_index: 0,
    coins: 5,
  },
  {
    id: 'q003',
    question: 'Which of these is NOT a stock index in India?',
    options: ['NIFTY 50', 'BSE SENSEX', 'NSDL', 'Bank NIFTY'],
    correct_index: 2,
    coins: 5,
  },
  {
    id: 'q004',
    question: 'What does RBI stand for?',
    options: ['Reserve Bank of India', 'Retail Banking Institution', 'Regional Bureau of India', 'Revenue Board of India'],
    correct_index: 0,
    coins: 5,
  },
  {
    id: 'q005',
    question: 'What is the lock-in period for ELSS (tax-saving mutual funds)?',
    options: ['1 year', '2 years', '3 years', '5 years'],
    correct_index: 2,
    coins: 10,
  },
];

/**
 * GET /api/v1/game/question
 * Returns a random finance quiz question.
 */
router.get('/question', authenticate, async (req, res) => {
  // Pick a random static question (can be extended with Gemini-generated ones)
  const q = STATIC_QUESTIONS[Math.floor(Math.random() * STATIC_QUESTIONS.length)];
  // Don't send the correct_index to the client
  const { correct_index, ...safeQ } = q;
  return res.json(safeQ);
});

/**
 * POST /api/v1/game/answer
 * Body: { question_id, selected_index }
 */
router.post('/answer', authenticate, async (req, res) => {
  const { question_id, selected_index } = req.body;
  if (!question_id || selected_index === undefined) {
    return res.status(400).json({ error: 'question_id and selected_index are required' });
  }

  const question = STATIC_QUESTIONS.find(q => q.id === question_id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const is_correct = selected_index === question.correct_index;
  const coins_earned = is_correct ? question.coins : 0;

  // Record attempt
  await supabase.from('quiz_attempts').insert({
    user_id:     req.user.id,
    question_id,
    is_correct,
    coins_earned,
  });

  // Update user coins if correct
  if (coins_earned > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', req.user.id)
      .single();

    const newCoins = (profile?.coins || 0) + coins_earned;
    const newTier = calculateTier(newCoins);

    await supabase.from('profiles').update({ coins: newCoins, tier: newTier }).eq('id', req.user.id);
  }

  return res.json({
    is_correct,
    coins_earned,
    correct_index:  question.correct_index,
    correct_answer: question.options[question.correct_index],
  });
});

/**
 * GET /api/v1/game/leaderboard
 */
router.get('/leaderboard', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, coins, tier')
    .order('coins', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

/**
 * GET /api/v1/user/tier
 */
router.get('/tier', authenticate, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('coins, tier')
    .eq('id', req.user.id)
    .single();

  const coins = profile?.coins || 0;
  const tier = calculateTier(coins);
  const { next, needed } = nextTierInfo(coins);

  return res.json({ tier, coins, next_tier: next, coins_needed: needed });
});

function calculateTier(coins) {
  if (coins >= 1500) return 'diamond';
  if (coins >= 700)  return 'platinum';
  if (coins >= 300)  return 'gold';
  if (coins >= 100)  return 'silver';
  return 'bronze';
}

function nextTierInfo(coins) {
  const thresholds = [
    { tier: 'silver',   min: 100 },
    { tier: 'gold',     min: 300 },
    { tier: 'platinum', min: 700 },
    { tier: 'diamond',  min: 1500 },
  ];
  for (const t of thresholds) {
    if (coins < t.min) return { next: t.tier, needed: t.min - coins };
  }
  return { next: 'max', needed: 0 };
}

module.exports = router;
