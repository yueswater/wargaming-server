const { getDb } = require('../db');

function mapRecord(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    replacedByTokenId: row.replaced_by_token_id,
    isExpired() {
      return new Date(row.expires_at).getTime() <= Date.now();
    },
    isActive() {
      return !row.revoked_at && new Date(row.expires_at).getTime() > Date.now();
    },
  };
}

async function createRefreshToken(data) {
  const db = await getDb();
  await db.run(
    `INSERT INTO refresh_tokens (
      id, user_id, token_hash, expires_at, created_at, last_used_at, revoked_at, user_agent, ip_address, replaced_by_token_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.userId,
      data.tokenHash,
      data.expiresAt,
      data.createdAt || new Date().toISOString(),
      data.lastUsedAt || null,
      data.revokedAt || null,
      data.userAgent || null,
      data.ipAddress || null,
      data.replacedByTokenId || null,
    ]
  );

  return getRefreshTokenById(data.id);
}

async function getRefreshTokenById(id) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM refresh_tokens WHERE id = ?', [id]);
  return mapRecord(row);
}

async function updateRefreshToken(id, patch) {
  const db = await getDb();
  const existing = await getRefreshTokenById(id);
  if (!existing) return null;

  await db.run(
    `UPDATE refresh_tokens
     SET token_hash = ?, expires_at = ?, last_used_at = ?, revoked_at = ?, user_agent = ?, ip_address = ?, replaced_by_token_id = ?
     WHERE id = ?`,
    [
      patch.tokenHash ?? existing.tokenHash,
      patch.expiresAt ?? existing.expiresAt,
      patch.lastUsedAt ?? existing.lastUsedAt,
      patch.revokedAt ?? existing.revokedAt,
      patch.userAgent ?? existing.userAgent,
      patch.ipAddress ?? existing.ipAddress,
      patch.replacedByTokenId ?? existing.replacedByTokenId,
      id,
    ]
  );

  return getRefreshTokenById(id);
}

async function revokeRefreshToken(id, replacedByTokenId = null) {
  return updateRefreshToken(id, {
    revokedAt: new Date().toISOString(),
    replacedByTokenId,
  });
}

async function revokeAllRefreshTokensForUser(userId) {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.run(
    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE user_id = ?',
    [now, userId]
  );
  return result.changes || 0;
}

module.exports = {
  createRefreshToken,
  getRefreshTokenById,
  updateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
};
