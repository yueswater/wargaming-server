const { Pool } = require('pg');

let pool = null;

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function getDb() {
  return {
    async get(sql, params = []) {
      const result = await pool.query(toPositional(sql), params);
      return result.rows[0] || null;
    },
    async all(sql, params = []) {
      const result = await pool.query(toPositional(sql), params);
      return result.rows;
    },
    async run(sql, params = []) {
      const result = await pool.query(toPositional(sql), params);
      return { changes: result.rowCount, lastID: null };
    },
    async exec(sql) {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('PRAGMA'));
      for (const stmt of statements) {
        await pool.query(stmt);
      }
    },
  };
}

async function initDatabase() {
  if (pool) return;

  pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_SOCKET_PATH
      ? process.env.DB_SOCKET_PATH
      : process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
  });

  const db = getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      game_role TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT,
      user_agent TEXT,
      ip_address TEXT,
      replaced_by_token_id TEXT
    );

    CREATE TABLE IF NOT EXISTS game_params (
      id INTEGER PRIMARY KEY,
      params TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS broadcast_notifications (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      outcome TEXT NOT NULL,
      final_opinion INTEGER NOT NULL,
      final_attack INTEGER NOT NULL,
      total_rounds INTEGER NOT NULL,
      players TEXT NOT NULL,
      rounds TEXT NOT NULL,
      aggregate_state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      ended_at TEXT NOT NULL
    )
  `);
}

module.exports = { initDatabase, getDb };
