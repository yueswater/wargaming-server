const { getUserById } = require('../models/user.model');
const { verifyAccessToken } = require('../services/token.service');

async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('缺少 access token'));
    }

    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      return next(new Error('無效的 token 類型'));
    }

    const user = await getUserById(payload.sub);
    if (!user || user.status !== 'active') {
      return next(new Error('使用者不存在或不可用'));
    }

    socket.data.user = user.toSafeJSON();
    return next();
  } catch (_err) {
    return next(new Error('socket 驗證失敗'));
  }
}

module.exports = {
  socketAuth,
};
