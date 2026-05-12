const connectedSocketsByUser = new Map();

function markConnected(userId, socketId) {
  const existing = connectedSocketsByUser.get(userId) || new Set();
  existing.add(socketId);
  connectedSocketsByUser.set(userId, existing);
}

function markDisconnected(userId, socketId) {
  const existing = connectedSocketsByUser.get(userId);
  if (!existing) return;
  existing.delete(socketId);
  if (existing.size === 0) {
    connectedSocketsByUser.delete(userId);
  } else {
    connectedSocketsByUser.set(userId, existing);
  }
}

function isUserOnline(userId) {
  return connectedSocketsByUser.has(userId);
}

function getConnectedUserIds() {
  return Array.from(connectedSocketsByUser.keys());
}

module.exports = {
  markConnected,
  markDisconnected,
  isUserOnline,
  getConnectedUserIds,
};
