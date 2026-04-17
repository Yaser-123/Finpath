require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

// Global rate limiter (100 req / 15 min per IP)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'finpath-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const BASE = '/api/v1';

app.use(`${BASE}/sms`,          require('./routes/sms'));
app.use(`${BASE}/transactions`, require('./routes/transactions'));
app.use(`${BASE}/goals`,        require('./routes/goals'));
app.use(`${BASE}/dashboard`,    require('./routes/dashboard'));
app.use(`${BASE}/agent`,        require('./routes/agent'));
app.use(`${BASE}/chat`,         require('./routes/chat'));
app.use(`${BASE}/wealth`,       require('./routes/wealth'));
app.use(`${BASE}/game`,         require('./routes/game'));

// Tier route (re-exported from game router for URL semantics)
app.use(`${BASE}/user`,         require('./routes/game'));

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const envStatus = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
  };

  console.log(`\n🚀 FinPath backend running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Gemini model: ${process.env.GEMINI_MODEL}`);
  console.log(`   Env status  : ${JSON.stringify(envStatus)}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
