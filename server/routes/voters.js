const express = require('express');
const { adminAuth } = require('../middleware/auth');
const {
  importVoterCsv,
  getRegisterSummary,
  exportRegisterCsv,
  registerSingleVoter,
  listVoters,
  deleteVoter
} = require('../services/voterRegister');
const router = express.Router();

router.use(adminAuth);

// GET /api/voters - list and search voters with pagination
router.get('/', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const result = listVoters({
      search: req.query.q || req.query.search || '',
      page: req.query.page,
      limit: req.query.limit
    });
    res.json(result);
  } catch (err) {
    console.error('List voters error:', err);
    res.status(500).json({ error: 'Failed to list voters' });
  }
});

// POST /api/voters - manually register a single voter
router.post('/', (req, res) => {
  try {
    const { stateCode, surname } = req.body || {};
    const voter = registerSingleVoter({ stateCode, surname });
    console.log(`👤 Manual voter registration: ${voter.stateCode} (${voter.surname}) [ID: ${voter.id}]`);
    res.status(201).json({
      message: 'Voter registered successfully',
      voter
    });
  } catch (err) {
    if (err.code === 'ALREADY_EXISTS') {
      return res.status(409).json({
        error: err.message,
        code: 'ALREADY_EXISTS',
        existing: err.existing
      });
    }
    res.status(400).json({ error: err.message || 'Failed to register voter' });
  }
});

// DELETE /api/voters/:id - remove voter if they have not voted yet
router.delete('/:id', (req, res) => {
  try {
    const result = deleteVoter(req.params.id);
    res.json({ message: `Voter ${result.stateCode} removed successfully`, id: result.id });
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message || 'Failed to delete voter' });
  }
});

// GET /api/voters/summary - register size, turnout and last import info
router.get('/summary', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(getRegisterSummary());
  } catch (err) {
    console.error('Voter summary error:', err);
    res.status(500).json({ error: 'Failed to load voter register summary' });
  }
});

// GET /api/voters/export - download the current register as CSV
router.get('/export', (req, res) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="voter-register-${date}.csv"`);
    res.set('Cache-Control', 'no-store');
    res.send(exportRegisterCsv());
  } catch (err) {
    console.error('Voter export error:', err);
    res.status(500).json({ error: 'Failed to export voter register' });
  }
});

// POST /api/voters/upload?mode=merge|replace&dryRun=true|false
// Body: raw CSV text (Content-Type: text/csv). Filename via X-Filename header.
router.post(
  '/upload',
  express.text({ type: ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'], limit: '5mb' }),
  (req, res) => {
    if (typeof req.body !== 'string' || req.body.trim() === '') {
      return res.status(400).json({ error: 'Upload a non-empty CSV file.' });
    }
    const mode = req.query.mode === 'replace' ? 'replace' : 'merge';
    const dryRun = req.query.dryRun !== 'false';
    let filename = null;
    try {
      filename = req.get('X-Filename') ? decodeURIComponent(req.get('X-Filename')).slice(0, 200) : null;
    } catch (_) { /* ignore malformed filename */ }

    try {
      const summary = importVoterCsv(req.body, { mode, dryRun, filename });
      if (!dryRun) {
        console.log(`🗂️  Voter register ${mode}: +${summary.added} ~${summary.updated} -${summary.removed} (now ${summary.registerAfter})`);
      }
      res.json(summary);
    } catch (err) {
      // Parsing/validation problems are the uploader's to fix
      console.error('Voter upload error:', err.message);
      res.status(400).json({ error: err.message || 'Failed to process CSV' });
    }
  }
);

// Friendly error for oversized uploads
router.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5 MB.' });
  }
  next(err);
});

module.exports = router;
