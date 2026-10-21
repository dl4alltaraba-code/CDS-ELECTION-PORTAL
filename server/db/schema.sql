CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code VARCHAR(20) UNIQUE NOT NULL,
    surname VARCHAR(100) NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL,
    manifesto TEXT,
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    candidate_id INTEGER REFERENCES candidates(id),
    position VARCHAR(50) NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, position)
);

CREATE TABLE IF NOT EXISTS election_result (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position VARCHAR(50) NOT NULL,
    candidate_id INTEGER REFERENCES candidates(id),
    votes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(position)
);

CREATE INDEX IF NOT EXISTS idx_users_state_code ON users(state_code);
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_position ON votes(position);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit log of voter register CSV imports from the admin dashboard
CREATE TABLE IF NOT EXISTS voter_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    mode VARCHAR(10) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    added INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0,
    removed INTEGER DEFAULT 0,
    kept_voted INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    register_size INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
