/**
 * Voter register service.
 *
 * Shared by the admin CSV upload endpoint and the startup seeder so that both
 * parse and import voters in exactly the same way.
 *
 * IMPORTANT: Voters are upserted (ON CONFLICT ... DO UPDATE), never
 * "INSERT OR REPLACE". REPLACE deletes and re-inserts the row, which gives the
 * voter a new `id` and orphans any votes already linked to the old id.
 */
const { get, all, run, runNoSave, transaction } = require('../db');

const STATE_CODE_PATTERN = /^[A-Z]{2}\/\d{2}[A-Z]\/[A-Z0-9]{3,5}$/;
const MAX_SURNAME_LENGTH = 100;
const MAX_REPORTED_ISSUES = 50;

// Normalised header names we recognise (lowercase, letters/digits only)
const STATE_CODE_HEADERS = ['statecode', 'statecodes', 'stateno', 'statenumber', 'code'];
const SURNAME_HEADERS = ['surname', 'lastname', 'familyname', 'name'];

function normaliseHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  return Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ',');
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF/LF). */
function parseCsvRows(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
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
    } else if (ch === delimiter) {
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
  return rows;
}

/**
 * Parse voter register CSV text.
 * Accepts a header row containing a state code column and a surname/name
 * column (any order, extra columns ignored), or a headerless "Surname,State Code" file.
 */
function parseVoterCsv(text) {
  const rows = parseCsvRows(text);
  const firstDataIndex = rows.findIndex(r => r.some(c => c.trim() !== ''));
  if (firstDataIndex === -1) {
    throw new Error('The file is empty.');
  }

  const header = rows[firstDataIndex].map(normaliseHeader);
  let codeCol = header.findIndex(h => STATE_CODE_HEADERS.includes(h));
  // Prefer an explicit "surname" column over a generic "name" column
  let surnameCol = -1;
  for (const key of SURNAME_HEADERS) {
    surnameCol = header.indexOf(key);
    if (surnameCol !== -1) break;
  }

  let startIndex = firstDataIndex + 1;
  if (codeCol === -1 || surnameCol === -1) {
    // No recognisable header: detect columns from the first row's values
    const first = rows[firstDataIndex].map(c => c.trim().toUpperCase());
    const detectedCode = first.findIndex(c => STATE_CODE_PATTERN.test(c));
    if (detectedCode === -1) {
      throw new Error('Could not find a "State Code" column. Expected headers like "Surname,State Code".');
    }
    codeCol = detectedCode;
    surnameCol = first.findIndex((_, i) => i !== detectedCode);
    if (surnameCol === -1) {
      throw new Error('Could not find a "Surname" column. Expected headers like "Surname,State Code".');
    }
    startIndex = firstDataIndex;
  }

  const byCode = new Map();
  const invalid = [];
  const duplicates = [];
  let totalRows = 0;

  for (let i = startIndex; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells.some(c => c.trim() !== '')) continue; // skip blank lines
    totalRows++;
    const line = i + 1;
    const stateCode = String(cells[codeCol] || '').trim().toUpperCase();
    const surname = String(cells[surnameCol] || '').trim().replace(/\s+/g, ' ');

    let reason = null;
    if (!stateCode) reason = 'Missing state code';
    else if (!STATE_CODE_PATTERN.test(stateCode)) reason = `Invalid state code "${stateCode}" (expected e.g. TR/25A/0406)`;
    else if (!surname) reason = 'Missing surname';
    else if (surname.length > MAX_SURNAME_LENGTH) reason = `Surname longer than ${MAX_SURNAME_LENGTH} characters`;

    if (reason) {
      invalid.push({ line, reason });
      continue;
    }
    if (byCode.has(stateCode)) {
      duplicates.push({ line, stateCode, firstLine: byCode.get(stateCode).line });
    }
    byCode.set(stateCode, { stateCode, surname, line }); // last occurrence wins
  }

  return { records: [...byCode.values()], totalRows, invalid, duplicates };
}

/** Work out what an import would change, without touching the database. */
function planImport(parsed, mode) {
  const existing = all('SELECT id, state_code, surname FROM users');
  const votedIds = new Set(all('SELECT DISTINCT user_id FROM votes').map(r => r.user_id));
  const existingByCode = new Map(existing.map(u => [u.state_code, u]));
  const incomingCodes = new Set(parsed.records.map(r => r.stateCode));

  const toAdd = [];
  const toUpdate = [];
  let unchanged = 0;
  for (const rec of parsed.records) {
    const current = existingByCode.get(rec.stateCode);
    if (!current) toAdd.push(rec);
    else if (current.surname !== rec.surname) toUpdate.push({ ...rec, previousSurname: current.surname });
    else unchanged++;
  }

  const toRemove = [];
  const keptBecauseVoted = [];
  if (mode === 'replace') {
    for (const u of existing) {
      if (incomingCodes.has(u.state_code)) continue;
      // Never delete voters who have already voted: it would orphan their ballots
      if (votedIds.has(u.id)) keptBecauseVoted.push(u);
      else toRemove.push(u);
    }
  }

  return { existingCount: existing.length, toAdd, toUpdate, unchanged, toRemove, keptBecauseVoted };
}

function applyPlan(plan, summary) {
  transaction(() => {
    for (const rec of [...plan.toAdd, ...plan.toUpdate]) {
      runNoSave(
        `INSERT INTO users (state_code, surname) VALUES (?, ?)
         ON CONFLICT(state_code) DO UPDATE SET surname = excluded.surname`,
        [rec.stateCode, rec.surname]
      );
    }
    for (const u of plan.toRemove) {
      runNoSave('DELETE FROM users WHERE id = ?', [u.id]);
    }
    runNoSave(
      `INSERT INTO voter_uploads (filename, mode, total_rows, added, updated, removed, kept_voted, invalid_rows, register_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [summary.filename, summary.mode, summary.totalRows, summary.added, summary.updated, summary.removed,
        summary.keptBecauseVoted, summary.invalidCount, summary.registerAfter]
    );
  });
}

/**
 * Parse + plan (+ optionally apply) a voter register import.
 * @param {string} csvText
 * @param {{ mode?: 'merge'|'replace', dryRun?: boolean, filename?: string }} options
 */
function importVoterCsv(csvText, { mode = 'merge', dryRun = true, filename = null } = {}) {
  if (mode !== 'merge' && mode !== 'replace') {
    throw new Error('Mode must be "merge" or "replace".');
  }
  const parsed = parseVoterCsv(csvText);
  if (parsed.records.length === 0) {
    throw new Error('No valid voter rows were found in the file.');
  }

  const plan = planImport(parsed, mode);
  const summary = {
    mode,
    dryRun,
    filename,
    totalRows: parsed.totalRows,
    validRows: parsed.records.length,
    invalidCount: parsed.invalid.length,
    invalid: parsed.invalid.slice(0, MAX_REPORTED_ISSUES),
    duplicateCount: parsed.duplicates.length,
    duplicates: parsed.duplicates.slice(0, MAX_REPORTED_ISSUES),
    added: plan.toAdd.length,
    updated: plan.toUpdate.length,
    unchanged: plan.unchanged,
    removed: plan.toRemove.length,
    keptBecauseVoted: plan.keptBecauseVoted.length,
    registerBefore: plan.existingCount,
    registerAfter: plan.existingCount + plan.toAdd.length - plan.toRemove.length,
  };

  if (!dryRun) {
    applyPlan(plan, summary);
  }

  return summary;
}

function getRegisterSummary() {
  const total = get('SELECT COUNT(*) AS total FROM users');
  const voted = get('SELECT COUNT(DISTINCT v.user_id) AS total FROM votes v JOIN users u ON u.id = v.user_id');
  const lastUpload = get(
    `SELECT filename, mode, added, updated, removed, kept_voted, invalid_rows, register_size, created_at
     FROM voter_uploads ORDER BY id DESC LIMIT 1`
  );
  return {
    total: total ? total.total : 0,
    voted: voted ? voted.total : 0,
    lastUpload: lastUpload || null,
  };
}

function csvEscape(value) {
  let s = String(value == null ? '' : value);
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportRegisterCsv() {
  const rows = all(`
    SELECT u.surname, u.state_code,
      CASE WHEN EXISTS (SELECT 1 FROM votes v WHERE v.user_id = u.id) THEN 'Yes' ELSE 'No' END AS has_voted
    FROM users u ORDER BY u.state_code
  `);
  const lines = ['Surname,State Code,Has Voted'];
  for (const r of rows) lines.push([r.surname, r.state_code, r.has_voted].map(csvEscape).join(','));
  return lines.join('\r\n') + '\r\n';
}

/**
 * Register a single voter manually.
 * @param {{ stateCode: string, surname: string }} param0
 */
function registerSingleVoter({ stateCode, surname }) {
  if (!stateCode || typeof stateCode !== 'string') {
    throw new Error('State code is required.');
  }
  if (!surname || typeof surname !== 'string') {
    throw new Error('Surname is required.');
  }

  const normalizedCode = stateCode.trim().toUpperCase();
  const normalizedSurname = surname.trim().replace(/\s+/g, ' ');

  if (!STATE_CODE_PATTERN.test(normalizedCode)) {
    throw new Error(`Invalid state code "${normalizedCode}". Expected format like TR/25A/0406.`);
  }

  if (normalizedSurname.length === 0) {
    throw new Error('Surname cannot be empty.');
  }

  if (normalizedSurname.length > MAX_SURNAME_LENGTH) {
    throw new Error(`Surname must not exceed ${MAX_SURNAME_LENGTH} characters.`);
  }

  const existing = get('SELECT id, state_code, surname FROM users WHERE state_code = ?', [normalizedCode]);
  if (existing) {
    const err = new Error(`State code "${normalizedCode}" is already registered (Surname: ${existing.surname}).`);
    err.code = 'ALREADY_EXISTS';
    err.existing = existing;
    throw err;
  }

  const id = run('INSERT INTO users (state_code, surname) VALUES (?, ?)', [normalizedCode, normalizedSurname]);
  return {
    id,
    stateCode: normalizedCode,
    surname: normalizedSurname,
  };
}

/**
 * List voters with pagination and search.
 */
function listVoters({ search = '', limit = 15, page = 1 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  let countSql = 'SELECT COUNT(*) AS total FROM users';
  let dataSql = `
    SELECT u.id, u.state_code, u.surname, u.created_at,
      CASE WHEN EXISTS (SELECT 1 FROM votes v WHERE v.user_id = u.id) THEN 1 ELSE 0 END AS has_voted
    FROM users u
  `;
  const params = [];

  const trimmed = String(search || '').trim();
  if (trimmed) {
    const filter = `%${trimmed}%`;
    countSql += ' WHERE state_code LIKE ? OR surname LIKE ?';
    dataSql += ' WHERE u.state_code LIKE ? OR u.surname LIKE ?';
    params.push(filter, filter);
  }

  dataSql += ' ORDER BY u.id DESC LIMIT ? OFFSET ?';
  const countRow = get(countSql, trimmed ? [params[0], params[1]] : []);
  const total = countRow ? countRow.total : 0;
  const rows = all(dataSql, trimmed ? [...params, safeLimit, offset] : [safeLimit, offset]);

  return {
    voters: rows.map(r => ({
      id: r.id,
      stateCode: r.state_code,
      surname: r.surname,
      hasVoted: Boolean(r.has_voted),
      createdAt: r.created_at,
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

/**
 * Delete a voter if they have not yet voted.
 */
function deleteVoter(id) {
  const voterId = parseInt(id, 10);
  if (!voterId) {
    const err = new Error('Invalid voter ID.');
    err.status = 400;
    throw err;
  }

  const existing = get('SELECT id, state_code, surname FROM users WHERE id = ?', [voterId]);
  if (!existing) {
    const err = new Error('Voter not found.');
    err.status = 404;
    throw err;
  }

  const hasVoted = get('SELECT 1 FROM votes WHERE user_id = ? LIMIT 1', [voterId]);
  if (hasVoted) {
    const err = new Error(`Cannot delete voter ${existing.state_code} because they have already cast ballots.`);
    err.status = 400;
    throw err;
  }

  run('DELETE FROM users WHERE id = ?', [voterId]);
  return { id: voterId, stateCode: existing.state_code };
}

module.exports = {
  STATE_CODE_PATTERN,
  parseVoterCsv,
  importVoterCsv,
  getRegisterSummary,
  exportRegisterCsv,
  registerSingleVoter,
  listVoters,
  deleteVoter,
};
