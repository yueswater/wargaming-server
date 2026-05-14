const {
  markConnected,
  markDisconnected,
  getConnectedUserIds,
} = require('./presence');
const { createBroadcastNotification } = require('../models/broadcastNotification.model');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    markConnected(userId, socket.id);
    socket.join(`role:${socket.data.user.role}`);

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

    socket.on('disconnect', () => {
      markDisconnected(userId, socket.id);
      io.emit('presence:update', { connectedUserIds: getConnectedUserIds() });
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
