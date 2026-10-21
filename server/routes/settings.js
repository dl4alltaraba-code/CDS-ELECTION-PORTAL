const express = require('express');
const { get, all, run } = require('../db');
const router = express.Router();

// Middleware to check admin auth for POST requests
const requireAdmin = (req, res, next) => {
  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized. Invalid admin passkey.' });
    }
  }
  next();
};

router.use(requireAdmin);

// GET /api/settings - Get all application settings
router.get('/', (req, res) => {
  try {
    // Prevent aggressive CDN or browser caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    const settings = all('SELECT key, value FROM settings');
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value === 'true';
    });
    
    // Provide defaults if not seeded
    if (settingsObj['voting_enabled'] === undefined) settingsObj['voting_enabled'] = true;
    if (settingsObj['results_visible'] === undefined) settingsObj['results_visible'] = true;
    if (settingsObj['candidates_voting_visible'] === undefined) settingsObj['candidates_voting_visible'] = true;

    res.json(settingsObj);
  } catch (err) {
    console.error('Settings GET error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Update application settings
router.post('/', (req, res) => {
  try {
    const { voting_enabled, results_visible, candidates_voting_visible } = req.body;
    
    if (typeof voting_enabled === 'boolean') {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['voting_enabled', voting_enabled.toString()]);
    }
    
    if (typeof results_visible === 'boolean') {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['results_visible', results_visible.toString()]);
    }
    
    if (typeof candidates_voting_visible === 'boolean') {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['candidates_voting_visible', candidates_voting_visible.toString()]);
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Settings POST error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/verify - Verify admin key on login
router.post('/verify', (req, res) => {
  res.json({ success: true, message: 'Admin key is valid' });
});

module.exports = router;
