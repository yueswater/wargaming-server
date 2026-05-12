const { v4: uuidv4 } = require('uuid');
const { allowSelfRegistration } = require('../config/auth.config');
const {
  createUser,
  getUserById,
  getUserByUsername,
  updateUser,
} = require('../models/user.model');
const {
  createRefreshToken,
  getRefreshTokenById,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  updateRefreshToken,
} = require('../models/refreshToken.model');
const {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} = require('./password.service');
const {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeJwtExpiry,
} = require('./token.service');

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,24}$/;

function validateRegistrationInput({ username, displayName, password }) {
  if (!USERNAME_REGEX.test(String(username || '').trim())) {
    throw new Error('帳號名稱需為 3 到 24 位，且只能包含英數、底線、句點或連字號');
  }

  if (String(displayName || '').trim().length < 2) {
    throw new Error('顯示名稱至少需要 2 個字元');
  }

  validatePasswordStrength(password);
}

async function issueSession(user, context = {}) {
  const accessToken = signAccessToken(user);
  const refreshTokenId = uuidv4();
  const refreshToken = signRefreshToken({
    userId: user.id,
    refreshTokenId,
  });

  await createRefreshToken({
    id: refreshTokenId,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: decodeJwtExpiry(refreshToken),
    createdAt: new Date().toISOString(),
    userAgent: context.userAgent || null,
    ipAddress: context.ipAddress || null,
  });

  return {
    accessToken,
    refreshToken,
    user: user.toSafeJSON(),
  };
}

async function register({ username, displayName, password }, context = {}) {
  if (!allowSelfRegistration) {
    throw new Error('目前未開放自行註冊');
  }

  validateRegistrationInput({ username, displayName, password });

  if (await getUserByUsername(username)) {
    throw new Error('此帳號名稱已被使用');
  }

  const user = await createUser({
    username,
    displayName: String(displayName).trim(),
    passwordHash: hashPassword(password),
    role: 'user',
    status: 'active',
  });

  const updatedUser = await updateUser(user.id, {
    lastLoginAt: new Date().toISOString(),
  });

  return issueSession(updatedUser, context);
}

async function login({ username, password }, context = {}) {
  const user = await getUserByUsername(username);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('帳號或密碼錯誤');
  }

  if (user.status !== 'active') {
    throw new Error('帳號目前無法登入');
  }

  const updatedUser = await updateUser(user.id, {
    lastLoginAt: new Date().toISOString(),
  });

  return issueSession(updatedUser, context);
}

async function refreshSession(refreshToken, context = {}) {
  if (!refreshToken) {
    throw new Error('缺少 refresh token');
  }

  const payload = verifyRefreshToken(refreshToken);
  if (payload.type !== 'refresh') {
    throw new Error('無效的 token 類型');
  }

  const record = await getRefreshTokenById(payload.jti);
  if (!record) {
    throw new Error('找不到 refresh token');
  }

  if (!record.isActive()) {
    throw new Error('refresh token 已失效');
  }

  if (record.tokenHash !== hashToken(refreshToken)) {
    await revokeRefreshToken(record.id);
    throw new Error('refresh token 驗證失敗');
  }

  const user = await getUserById(payload.sub);
  if (!user || user.status !== 'active') {
    throw new Error('帳號無效');
  }

  const nextSession = await issueSession(user, context);
  await updateRefreshToken(record.id, {
    lastUsedAt: new Date().toISOString(),
    revokedAt: new Date().toISOString(),
    replacedByTokenId: verifyRefreshToken(nextSession.refreshToken).jti,
  });

  return nextSession;
}

async function logout(refreshToken) {
  if (!refreshToken) return;

  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefreshToken(payload.jti);
  } catch (_err) {
    // Ignore invalid tokens on logout.
  }
}

async function logoutAll(userId) {
  await revokeAllRefreshTokensForUser(userId);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('找不到使用者');
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('目前密碼錯誤');
  }

  validatePasswordStrength(newPassword);
  const updatedUser = await updateUser(user.id, {
    passwordHash: hashPassword(newPassword),
  });
  await revokeAllRefreshTokensForUser(user.id);

  return updatedUser.toSafeJSON();
}

module.exports = {
  register,
  login,
  refreshSession,
  logout,
  logoutAll,
  changePassword,
};
