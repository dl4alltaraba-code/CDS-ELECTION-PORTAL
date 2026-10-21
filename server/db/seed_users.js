const fs = require('fs');
const path = require('path');
const { initialize, get } = require('./index');
const { importVoterCsv } = require('../services/voterRegister');

/**
 * Bootstrap the voter register from stuff/users.csv.
 *
 * Only runs when the register is empty (e.g. a fresh deploy). Once voters
 * exist, the register is managed from the admin dashboard (Voter Register
 * upload), so restarts never overwrite or re-add voters an admin changed.
 * Pass --force to merge the CSV into an existing register anyway.
 */
async function seedUsers() {
  const csvPath = path.join(__dirname, '..', '..', 'stuff', 'users.csv');
  const force = process.argv.includes('--force');

  try {
    await initialize();

    const existing = get('SELECT COUNT(*) AS total FROM users');
    if (existing && existing.total > 0 && !force) {
      console.log(`ℹ️  Voter register already has ${existing.total} voters — skipping CSV seed (manage it from the admin dashboard).`);
      return;
    }

    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️  stuff/users.csv not found — starting with an empty voter register. Upload one from the admin dashboard.');
      return;
    }

    console.log(`Reading users from ${csvPath}...`);
    const summary = importVoterCsv(fs.readFileSync(csvPath, 'utf8'), {
      mode: 'merge',
      dryRun: false,
      filename: 'users.csv (startup seed)',
    });
    console.log(`✅ Voters seeded: ${summary.added} added, ${summary.updated} updated (${summary.registerAfter} total).`);
    if (summary.invalidCount) console.warn(`⚠️  Skipped ${summary.invalidCount} invalid row(s).`);
  } catch (err) {
    console.error('❌ Error seeding voters:', err);
    process.exit(1);
  }
}

seedUsers();
