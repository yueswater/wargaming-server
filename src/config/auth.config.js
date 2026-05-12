require('dotenv').config();

const accessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

module.exports = {
  accessSecret,
  refreshSecret,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  refreshCookieName: 'wargame_refresh_token',
  databasePath: process.env.DATABASE_PATH || './data/wargaming.sqlite',
  allowSelfRegistration: process.env.ALLOW_SELF_REGISTRATION === 'true',
};
