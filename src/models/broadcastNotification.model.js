const { getDb } = require('../db');

function mapBroadcastNotification(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    message: row.message,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
  };
}

async function createBroadcastNotification({ message, createdByUserId }) {
  const db = await getDb();
  const createdAt = new Date().toISOString();

  await db.run(
    `INSERT INTO broadcast_notifications (message, created_at, created_by_user_id)
     VALUES (?, ?, ?)`,
    [message, createdAt, createdByUserId || null],
  );

  const row = await db.get(
    `SELECT id, message, created_at, created_by_user_id
     FROM broadcast_notifications
     ORDER BY id DESC
     LIMIT 1`
  );

  return mapBroadcastNotification(row);
}

async function listBroadcastNotifications(limit = 50) {
  const db = await getDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const rows = await db.all(
    `SELECT id, message, created_at, created_by_user_id
     FROM broadcast_notifications
     ORDER BY id DESC
     LIMIT ?`,
    [safeLimit],
  );

  return rows.map(mapBroadcastNotification);
}

module.exports = {
  createBroadcastNotification,
  listBroadcastNotifications,
};
