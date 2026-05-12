const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
  accessSecret,
  refreshSecret,
  accessExpiresIn,
  refreshExpiresIn,
} = require('../config/auth.config');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      username: user.username,
      type: 'access',
    },
    accessSecret,
    { expiresIn: accessExpiresIn }
  );
}

function signRefreshToken({ userId, refreshTokenId }) {
  return jwt.sign(
    {
      sub: userId,
      jti: refreshTokenId,
      type: 'refresh',
    },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}

function decodeJwtExpiry(token) {
  const decoded = jwt.decode(token);
  return decoded && decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;
}

module.exports = {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeJwtExpiry,
};
