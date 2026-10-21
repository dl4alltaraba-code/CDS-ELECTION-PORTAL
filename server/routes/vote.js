const express = require('express');
const { get, runNoSave, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// POST /api/vote  — submit all votes at once (one per position)
router.post('/', authenticate, (req, res) => {
  try {
    const { votes } = req.body; // Array of { candidateId, position }
    const userId = req.user.userId;

    if (!votes || !Array.isArray(votes) || votes.length === 0) {
      return res.status(400).json({ error: 'Votes array is required' });
    }

    // Voter may have been removed from the register after their token was issued
    if (!get('SELECT id FROM users WHERE id = ?', [userId])) {
      return res.status(403).json({ error: 'You are no longer on the voter register.' });
    }

    // Validate each vote
    for (const vote of votes) {
      if (!vote.candidateId || !vote.position) {
        return res.status(400).json({ error: 'Each vote must have candidateId and position' });
      }

      const candidate = get('SELECT id, name, position FROM candidates WHERE id = ?', [vote.candidateId]);
      if (!candidate) {
        return res.status(404).json({ error: `Candidate ${vote.candidateId} not found` });
      }
      if (candidate.position !== vote.position) {
        return res.status(400).json({ error: `Candidate ${candidate.name} is not running for ${vote.position}` });
      }
    }

    // Atomic transaction for all votes
    try {
      transaction(() => {
        for (const vote of votes) {
          // Check if already voted for this position
          const existing = get(
            'SELECT id FROM votes WHERE user_id = ? AND position = ?',
            [userId, vote.position]
          );

          if (existing) {
            throw new Error(`ALREADY_VOTED:${vote.position}`);
          }

          // Insert vote
          runNoSave(
            'INSERT INTO votes (user_id, candidate_id, position) VALUES (?, ?, ?)',
            [userId, vote.candidateId, vote.position]
          );
        }
      });
    } catch (txErr) {
      if (txErr.message && txErr.message.startsWith('ALREADY_VOTED:')) {
        const pos = txErr.message.split(':')[1];
        return res.status(403).json({ error: `You have already voted for ${pos}.` });
      }
      if (txErr.message && txErr.message.includes('UNIQUE')) {
        return res.status(403).json({ error: 'Duplicate vote detected.' });
      }
      throw txErr;
    }

    res.json({
      message: 'All votes cast successfully!',
      count: votes.length
    });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to submit votes' });
  }
});

module.exports = router;
