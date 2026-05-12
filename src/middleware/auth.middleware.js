const { getUserById } = require('../models/user.model');
const { verifyAccessToken } = require('../services/token.service');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: '缺少 access token' });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      return res.status(401).json({ error: '無效的 token 類型' });
    }

    const user = await getUserById(payload.sub);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: '使用者不存在或不可用' });
    }

    req.user = user.toSafeJSON();
    req.accessToken = token;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'access token 無效或已過期' });
  }
}

module.exports = {
  requireAuth,
};
