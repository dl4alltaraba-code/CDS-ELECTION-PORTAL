const express = require('express');
const jwt = require('jsonwebtoken');
const { get, all } = require('../db');
const { STATE_CODE_PATTERN } = require('../services/voterRegister');
const router = express.Router();

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  try {
    const { stateCode, surname } = req.body;

    if (!stateCode || typeof stateCode !== 'string') {
      return res.status(400).json({ error: 'State code is required' });
    }
    if (!surname || typeof surname !== 'string') {
      return res.status(400).json({ error: 'Surname is required' });
    }

    const trimmed = stateCode.trim().toUpperCase();

    // Validate format: XX/XXX/XXXX or similar patterns
    if (!STATE_CODE_PATTERN.test(trimmed)) {
      return res.status(400).json({ error: 'Invalid state code format. Expected format: AB/23A/1234' });
    }

    // Check if state code exists
    const user = get('SELECT id, state_code, surname FROM users WHERE state_code = ?', [trimmed]);

    if (!user) {
      return res.status(404).json({ error: 'State code not found. You are not registered to vote.' });
    }

    // Check surname match (case-insensitive)
    if (user.surname.toLowerCase() !== surname.trim().toLowerCase()) {
      return res.status(401).json({ error: 'Authentication failed. Surname does not match the registered state code.' });
    }

    // Check how many positions they've already voted for
    const votedPositions = all('SELECT position FROM votes WHERE user_id = ?', [user.id]);
    const totalPositions = all('SELECT DISTINCT position FROM candidates');

    if (votedPositions.length >= totalPositions.length) {
      return res.status(403).json({ error: 'You have already completed voting for all positions.' });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, stateCode: user.state_code },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      token,
      message: 'Verification successful',
      votedPositions: votedPositions.map(v => v.position)
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

module.exports = router;
