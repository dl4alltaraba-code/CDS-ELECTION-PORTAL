const fs = require('fs');
const path = require('path');
const { initialize, run, all, saveDb, transaction, runNoSave } = require('./index');
const { importVoterCsv } = require('../services/voterRegister');

function parseCsv(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seedFromStuff() {
  console.log('🌱 Starting database seeding from stuff folder...');
  await initialize();

  // 1. Seed Voters from stuff/voters.csv
  const votersPath = path.join(__dirname, '..', '..', 'stuff', 'voters.csv');
  if (!fs.existsSync(votersPath)) {
    throw new Error(`File not found: ${votersPath}`);
  }

  const votersCsv = fs.readFileSync(votersPath, 'utf8');
  console.log('🗳️  Seeding voters from stuff/voters.csv...');
  const voterSummary = importVoterCsv(votersCsv, {
    mode: 'replace',
    dryRun: false,
    filename: 'voters.csv (stuff seed)',
  });
  console.log(`✅ Voters register updated: ${voterSummary.added} added, ${voterSummary.removed} removed, total ${voterSummary.registerAfter} registered voters.`);

  // 2. Seed Candidates from stuff/candidates list.csv
  const candidatesPath = path.join(__dirname, '..', '..', 'stuff', 'candidates list.csv');
  if (!fs.existsSync(candidatesPath)) {
    throw new Error(`File not found: ${candidatesPath}`);
  }

  const candRows = parseCsv(fs.readFileSync(candidatesPath, 'utf8'));
  console.log(`👥 Parsing ${candRows.length - 1} candidates from stuff/candidates list.csv...`);

  const candidates = [];
  for (let i = 1; i < candRows.length; i++) {
    const row = candRows[i];
    let name = row[0].trim().replace(/\s+/g, ' ');
    let position = row[1].trim().replace(/\s+/g, ' ');
    let manifesto = row[2] ? row[2].trim() : '';
    const slug = slugify(name);

    // Normalize positions
    if (position.toUpperCase() === 'VP') {
      position = 'Vice President';
    } else if (name.toLowerCase().includes('doris emmanuel')) {
      // User decision: Doris Emmanuel registered under General Secretary
      position = 'General Secretary';
    }

    const localPhoto = `/images/candidates/${slug}.jpg`;
    const photoExists = fs.existsSync(path.join(__dirname, '..', '..', 'public', 'images', 'candidates', `${slug}.jpg`));
    const imageUrl = photoExists ? localPhoto : null;

    candidates.push({
      name,
      position,
      manifesto,
      image_url: imageUrl,
    });
  }

  // Desired ordering of positions for assigning IDs
  const positionPriority = [
    'President',
    'Vice President',
    'General Secretary',
    'Assistant General Secretary',
    'Financial Secretary',
    'Welfare Secretary',
    'Project Manager',
    'Provost',
    'Director of Socials',
    'Head of Hackathon',
  ];

  candidates.sort((a, b) => {
    const pA = positionPriority.indexOf(a.position);
    const pB = positionPriority.indexOf(b.position);
    const posA = pA === -1 ? 999 : pA;
    const posB = pB === -1 ? 999 : pB;
    if (posA !== posB) return posA - posB;
    return a.name.localeCompare(b.name);
  });

  transaction(() => {
    runNoSave('DELETE FROM candidates');
    runNoSave('DELETE FROM sqlite_sequence WHERE name = "candidates"');

    candidates.forEach((c, idx) => {
      runNoSave(
        'INSERT INTO candidates (id, name, position, manifesto, image_url) VALUES (?, ?, ?, ?, ?)',
        [idx + 1, c.name, c.position, c.manifesto, c.image_url]
      );
    });
  });

  console.log(`✅ Seeded ${candidates.length} candidates across ${new Set(candidates.map(c => c.position)).size} positions:`);
  const grouped = {};
  candidates.forEach(c => {
    grouped[c.position] = grouped[c.position] || [];
    grouped[c.position].push(c.name);
  });
  Object.keys(grouped).forEach(pos => {
    console.log(`   • ${pos} (${grouped[pos].length}): ${grouped[pos].join(', ')}`);
  });

  saveDb();
  console.log('🎉 Seeding successfully completed!');
}

seedFromStuff().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
