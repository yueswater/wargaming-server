const {
  markConnected,
  markDisconnected,
  getConnectedUserIds,
} = require('./presence');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    markConnected(userId, socket.id);

    socket.emit('system:connected', {
      user: socket.data.user,
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
    });
    io.emit('presence:update', { connectedUserIds: getConnectedUserIds() });

    socket.on('disconnect', () => {
      markDisconnected(userId, socket.id);
      io.emit('presence:update', { connectedUserIds: getConnectedUserIds() });
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
