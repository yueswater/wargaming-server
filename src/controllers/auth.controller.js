const { allowSelfRegistration, refreshCookieName, cookieSecure } = require('../config/auth.config');
const {
  register,
  login,
  refreshSession,
  logout,
  logoutAll,
} = require('../services/auth.service');

function getRequestContext(req) {
  return {
    userAgent: req.headers['user-agent'] || null,
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/api/auth',
  });
}

exports.register = async (req, res) => {
  if (!allowSelfRegistration) {
    return res.status(403).json({ error: '目前未開放自行註冊' });
  }

  try {
    const session = await register(req.body, getRequestContext(req));
    setRefreshCookie(res, session.refreshToken);
    return res.status(201).json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const session = await login(req.body, getRequestContext(req));
    setRefreshCookie(res, session.refreshToken);
    return res.json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[refreshCookieName] || req.body?.refreshToken;
    const session = await refreshSession(refreshToken, getRequestContext(req));
    setRefreshCookie(res, session.refreshToken);
    return res.json({
      user: session.user,
      accessToken: session.accessToken,
    });
  } catch (err) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  const refreshToken = req.cookies?.[refreshCookieName] || req.body?.refreshToken;
  await logout(refreshToken);
  clearRefreshCookie(res);
  return res.status(204).end();
};

exports.logoutAll = async (req, res) => {
  await logoutAll(req.user.id);
  clearRefreshCookie(res);
  return res.status(204).end();
};
