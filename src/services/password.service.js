const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString('hex');

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, n, r, p, salt, originalKey] = String(storedHash || '').split('$');

  if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !originalKey) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, Buffer.from(originalKey, 'hex').length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  const originalBuffer = Buffer.from(originalKey, 'hex');
  return crypto.timingSafeEqual(derivedKey, originalBuffer);
}

function validatePasswordStrength(password) {
  const value = String(password || '');

  if (value.length < 10) {
    throw new Error('密碼至少需要 10 個字元');
  }

  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error('密碼必須同時包含英文字母與數字');
  }

  return true;
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
};
