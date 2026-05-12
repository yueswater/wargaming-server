const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    gameRole: row.game_role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    passwordHash: row.password_hash,
    toSafeJSON() {
      return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        role: row.role,
        gameRole: row.game_role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at,
      };
    },
  };
}

async function createUser(data) {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = data.id || uuidv4();
  const username = normalizeUsername(data.username);

  await db.run(
    `INSERT INTO users (
      id, username, display_name, password_hash, role, game_role, status, created_at, updated_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      username,
      data.displayName,
      data.passwordHash,
      data.role || 'user',
      data.gameRole || null,
      data.status || 'active',
      now,
      now,
      data.lastLoginAt || null,
    ]
  );

  return getUserById(id);
}

async function getUserById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  return mapUser(row);
}

async function getUserByUsername(username) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM users WHERE username = ?', [normalizeUsername(username)]);
  return mapUser(row);
}

async function updateUser(id, patch) {
  const db = await getDb();
  const existing = await getUserById(id);
  if (!existing) return null;

  const nextUsername = patch.username ? normalizeUsername(patch.username) : existing.username;
  const nextDisplayName = patch.displayName ?? existing.displayName;
  const nextPasswordHash = patch.passwordHash ?? existing.passwordHash;
  const nextRole = patch.role ?? existing.role;
  const nextGameRole = patch.gameRole ?? existing.gameRole;
  const nextStatus = patch.status ?? existing.status;
  const nextLastLoginAt = patch.lastLoginAt ?? existing.lastLoginAt;
  const updatedAt = new Date().toISOString();

  await db.run(
    `UPDATE users
     SET username = ?, display_name = ?, password_hash = ?, role = ?, game_role = ?, status = ?, updated_at = ?, last_login_at = ?
     WHERE id = ?`,
    [
      nextUsername,
      nextDisplayName,
      nextPasswordHash,
      nextRole,
      nextGameRole,
      nextStatus,
      updatedAt,
      nextLastLoginAt,
      id,
    ]
  );

  return getUserById(id);
}

async function listUsers() {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM users ORDER BY created_at ASC');
  return rows.map(mapUser);
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  updateUser,
  listUsers,
  normalizeUsername,
};
