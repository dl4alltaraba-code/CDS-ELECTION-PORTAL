const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// DB_PATH lets the VPS keep the database outside the code directory, so a
// redeploy or git pull never touches live votes.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'election.db');

let db = null;

async function initialize() {
  const SQL = await initSqlJs();
  
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📂 Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  // Run seed - execute line by line
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
  const statements = seed.split(';').filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    try {
      db.run(stmt.trim() + ';');
    } catch (e) {
      // Ignore INSERT OR IGNORE errors
    }
  }

  console.log('✅ Database initialized and seeded');
  saveDb();
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  return db;
}

let lastInsertedId = null;

// Helper: run a query that modifies data and auto-save
function run(sql, params = []) {
  db.run(sql, params);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  if (stmt.step()) {
    lastInsertedId = stmt.getAsObject().id;
  }
  stmt.free();
  saveDb();
  return lastInsertedId;
}

// Internal run without save (for use inside transactions)
function runNoSave(sql, params = []) {
  db.run(sql, params);
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  if (stmt.step()) {
    lastInsertedId = stmt.getAsObject().id;
  }
  stmt.free();
}

// Helper: get one row
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

// Helper: get all rows
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run in transaction
function transaction(fn) {
  runNoSave('BEGIN TRANSACTION');
  try {
    const result = fn();
    runNoSave('COMMIT');
    saveDb();
    return result;
  } catch (err) {
    try {
      runNoSave('ROLLBACK');
    } catch (rollbackErr) {
      // ignore rollback errors
    }
    throw err;
  }
}

// Helper: get last insert rowid
function lastInsertRowId() {
  return lastInsertedId;
}

module.exports = { initialize, getDb, run, runNoSave, get, all, transaction, lastInsertRowId, saveDb };
