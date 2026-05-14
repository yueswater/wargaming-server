const { listBroadcastNotifications } = require('../models/broadcastNotification.model');

exports.list = async (req, res) => {
  try {
    const notifications = await listBroadcastNotifications(req.query.limit);
    return res.json({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        message: notification.message,
        sentAt: notification.createdAt,
      })),
    });
  } catch (_err) {
    return res.status(500).json({ error: '無法取得廣播通知' });
  }
};
