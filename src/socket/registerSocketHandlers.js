const {
  markConnected,
  markDisconnected,
  getConnectedUserIds,
} = require('./presence');
const { createBroadcastNotification } = require('../models/broadcastNotification.model');
const { getGame } = require('../models/game.model');
const { buildSettlement } = require('../services/settlement.service');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    markConnected(userId, socket.id);
    socket.join(`role:${socket.data.user.role}`);
    socket.join(`user:${userId}`);

    socket.emit('system:connected', {
      user: socket.data.user,
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });
    io.emit('presence:update', { connectedUserIds: getConnectedUserIds() });

    socket.on('broadcast:send', async (data) => {
      if (socket.data.user.role !== 'admin') return;
      const message = typeof data?.message === 'string' ? data.message.trim() : '';
      if (!message) return;
      try {
        const notification = await createBroadcastNotification({
          message,
          createdByUserId: socket.data.user.id,
        });
        io.emit('broadcast:message', {
          id: notification.id,
          message: notification.message,
          sentAt: notification.createdAt,
        });
      } catch (_err) {
        socket.emit('broadcast:error', { error: '廣播儲存失敗' });
      }
    });

    // God view opens the settlement screen → broadcast the modal to every
    // account and lock down every non-admin client.
    socket.on('settlement:show', (data) => {
      if (socket.data.user.role !== 'admin') return;
      const game = getGame(data?.gameId);
      if (!game) return;
      if (!game.settlementShownAt) {
        game.settlementShownAt = new Date().toISOString();
      }
      io.emit('settlement:open', buildSettlement(game));
    });

    socket.on('disconnect', () => {
      markDisconnected(userId, socket.id);
      io.emit('presence:update', { connectedUserIds: getConnectedUserIds() });
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
