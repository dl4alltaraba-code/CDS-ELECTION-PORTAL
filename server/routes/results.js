const express = require('express');
const { get, all } = require('../db');
const router = express.Router();

// GET /api/results
router.get('/', (req, res) => {
  try {
    // Get results grouped by position
    const positions = all('SELECT DISTINCT position FROM candidates ORDER BY position');
    const positionOrder = ['President', 'Vice President', 'General Secretary', 'Treasurer', 'Financial Secretary', 'Welfare Secretary', 'Project Manager', 'Provost'];

    const results = [];

    for (const pos of positionOrder) {
      const totalForPosition = get(
        'SELECT COUNT(*) as total FROM votes WHERE position = ?', [pos]
      );
      const totalVotes = totalForPosition ? totalForPosition.total : 0;

      const candidates = all(`
        SELECT 
          c.id,
          c.name,
          c.position,
          c.image_url,
          COUNT(v.id) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON c.id = v.candidate_id
        WHERE c.position = ?
        GROUP BY c.id
        ORDER BY vote_count DESC
      `, [pos]);

      if (candidates.length > 0) {
        results.push({
          position: pos,
          totalVotes,
          candidates: candidates.map(c => ({
            ...c,
            percentage: totalVotes > 0 ? ((c.vote_count / totalVotes) * 100).toFixed(1) : '0.0'
          }))
        });
      }
    }

    // Overall stats
    const totalVotesAll = get('SELECT COUNT(*) as total FROM votes');
    const totalRegistered = get('SELECT COUNT(*) as total FROM users');
    const uniqueVoters = get('SELECT COUNT(DISTINCT user_id) as total FROM votes');

    res.json({
      totalVotes: totalVotesAll ? totalVotesAll.total : 0,
      totalRegistered: totalRegistered ? totalRegistered.total : 0,
      uniqueVoters: uniqueVoters ? uniqueVoters.total : 0,
      positions: results 
    });
  } catch (err) {
    console.error('Results error:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET /api/results/stats
router.get('/stats', (req, res) => {
  try {
    const totalRegistered = get('SELECT COUNT(*) as total FROM users');
    const uniqueVoters = get('SELECT COUNT(DISTINCT user_id) as total FROM votes');
    const totalCandidates = get('SELECT COUNT(*) as total FROM candidates');
    const totalPositions = get('SELECT COUNT(DISTINCT position) as total FROM candidates');

    const regCount = totalRegistered ? totalRegistered.total : 0;
    const voterCount = uniqueVoters ? uniqueVoters.total : 0;

    res.json({
      totalRegistered: regCount,
      totalVoted: voterCount,
      totalCandidates: totalCandidates ? totalCandidates.total : 0,
      totalPositions: totalPositions ? totalPositions.total : 0,
      turnout: regCount > 0 ? ((voterCount / regCount) * 100).toFixed(1) : '0.0'
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
