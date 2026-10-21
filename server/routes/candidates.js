const express = require('express');
const { get, all, run, lastInsertRowId } = require('../db');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/candidates
router.get('/', (req, res) => {
  try {
    const candidates = all('SELECT id, name, position, manifesto, image_url FROM candidates ORDER BY position, id');
    
    // Group by position
    const grouped = {};
    const positionOrder = [
      'President',
      'Vice President',
      'General Secretary',
      'Assistant General Secretary',
      'Treasurer',
      'Financial Secretary',
      'Welfare Secretary',
      'Project Manager',
      'Provost',
      'Director of Socials',
      'Head of Hackathon'
    ];
    
    candidates.forEach(c => {
      if (!grouped[c.position]) {
        grouped[c.position] = [];
      }
      grouped[c.position].push(c);
    });

    // Return ordered
    const ordered = positionOrder
      .filter(p => grouped[p])
      .map(p => ({
        position: p,
        candidates: grouped[p]
      }));

    // Append any extra positions not listed in positionOrder
    Object.keys(grouped).forEach(p => {
      if (!positionOrder.includes(p)) {
        ordered.push({ position: p, candidates: grouped[p] });
      }
    });

    res.json({ positions: ordered, all: candidates });
  } catch (err) {
    console.error('Candidates fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

const path = require('path');
const fs = require('fs');

// Helper to save base64 uploaded image to public/images/candidates
function saveCandidateImage(imageData, originalFilename, candidateName) {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error('Invalid image data');
  }

  const matches = imageData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  let ext = 'jpg';
  let base64String = imageData;

  if (matches) {
    let mimeSub = matches[1].toLowerCase();
    if (mimeSub === 'jpeg') ext = 'jpg';
    else if (mimeSub === 'png') ext = 'png';
    else if (mimeSub === 'webp') ext = 'webp';
    else if (mimeSub === 'gif') ext = 'gif';
    else if (mimeSub === 'svg+xml') ext = 'svg';
    base64String = matches[2];
  } else if (originalFilename) {
    const dotExt = path.extname(originalFilename).toLowerCase().replace('.', '');
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(dotExt)) {
      ext = dotExt === 'jpeg' ? 'jpg' : dotExt;
    }
  }

  const buffer = Buffer.from(base64String, 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image too large. Maximum size is 5 MB.');
  }

  const uploadDir = path.join(__dirname, '..', '..', 'public', 'images', 'candidates');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const nameSlug = (candidateName || 'candidate')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'candidate';

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filename = `upload-${nameSlug}-${uniqueSuffix}.${ext}`;
  const targetPath = path.join(uploadDir, filename);

  fs.writeFileSync(targetPath, buffer);
  return `/images/candidates/${filename}`;
}

// POST /api/candidates/upload-image (admin) - dedicated image upload endpoint
router.post('/upload-image', adminAuth, (req, res) => {
  try {
    const { image_data, image_name, candidate_name } = req.body;
    if (!image_data) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    const imageUrl = saveCandidateImage(image_data, image_name, candidate_name);
    res.json({ success: true, image_url: imageUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(400).json({ error: err.message || 'Failed to upload image' });
  }
});

// POST /api/candidates (admin)
router.post('/', adminAuth, (req, res) => {
  try {
    const { name, position, manifesto, image_url, image_data, image_filename } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Candidate name is required' });
    }
    if (!position || !position.trim()) {
      return res.status(400).json({ error: 'Candidate position is required' });
    }

    let finalImageUrl = null;
    if (image_data && typeof image_data === 'string' && image_data.trim()) {
      finalImageUrl = saveCandidateImage(image_data, image_filename, name);
    } else if (image_url && typeof image_url === 'string' && image_url.trim()) {
      finalImageUrl = image_url.trim();
    }

    run(
      'INSERT INTO candidates (name, position, manifesto, image_url) VALUES (?, ?, ?, ?)',
      [name.trim(), position.trim(), manifesto ? manifesto.trim() : null, finalImageUrl]
    );
    
    const id = lastInsertRowId();

    res.status(201).json({
      id,
      name: name.trim(),
      position: position.trim(),
      image_url: finalImageUrl,
      message: 'Candidate added successfully'
    });
  } catch (err) {
    console.error('Candidate add error:', err);
    res.status(500).json({ error: err.message || 'Failed to add candidate' });
  }
});

// DELETE /api/candidates/:id (admin)
router.delete('/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const existing = get('SELECT id, image_url FROM candidates WHERE id = ?', [parseInt(id)]);

    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Clean up uploaded image if it was uploaded to /images/candidates/upload-*
    if (existing.image_url && existing.image_url.startsWith('/images/candidates/upload-')) {
      const filePath = path.join(__dirname, '..', '..', 'public', existing.image_url);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }

    run('DELETE FROM candidates WHERE id = ?', [parseInt(id)]);
    res.json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    console.error('Candidate delete error:', err);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

module.exports = router;

