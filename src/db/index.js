const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { databasePath } = require('../config/auth.config');

let dbPromise = null;

async function initDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    const resolvedPath = path.resolve(process.cwd(), databasePath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

    const db = await open({
      filename: resolvedPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      PRAGMA foreign_keys = ON;

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
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT,
        user_agent TEXT,
        ip_address TEXT,
        replaced_by_token_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    return db;
  })();

  return dbPromise;
}

async function getDb() {
  return initDatabase();
}

module.exports = {
  initDatabase,
  getDb,
};
