require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initialize } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many vote attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/vote', voteLimiter, require('./routes/vote'));
app.use('/api/results', require('./routes/results'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/voters', require('./routes/voters'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server after async DB init
(async () => {
  try {
    await initialize();
    app.listen(PORT, () => {
      console.log(`\n🗳️  DL4ALL Election Server running on http://localhost:${PORT}`);
      console.log(`📊 Admin panel: http://localhost:${PORT}/admin.html`);
      console.log(`👥 Candidates: http://localhost:${PORT}/candidates.html`);
      console.log(`🗳️  Voting: http://localhost:${PORT}/vote.html`);
      console.log(`\n📋 Sample state codes: NY/24C/0001 — NY/24C/0010`);
      console.log(`📋 Candidate codes: TR/25B/1135, TR/25A/2108, etc.\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();
