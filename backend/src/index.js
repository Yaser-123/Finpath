require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
// Behind ngrok/reverse proxies, Express must trust forwarded headers so
// req.ip and rate limiting work correctly.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

// Global rate limiter. Exclude SMS parse flood traffic from this bucket,
// otherwise sync bursts throttle dashboard/history requests.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/v1/sms/parse',
});
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
app.use(`${BASE}/profile`,      require('./routes/profile'));

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
