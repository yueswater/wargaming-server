const { getDb } = require('../db');
const { DEFAULT_PARAMS } = require('../services/gameEngine');

let cache = null;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeParams(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? [...override] : [...base];
  }

  if (!isPlainObject(base)) {
    return override === undefined ? base : override;
  }

  const merged = { ...base };
  if (!isPlainObject(override)) {
    return merged;
  }

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    if (Array.isArray(baseValue)) {
      merged[key] = Array.isArray(value) ? [...value] : [...baseValue];
      continue;
    }
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      merged[key] = mergeParams(baseValue, value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

async function loadParams() {
  const db = getDb();
  const row = await db.get('SELECT params FROM game_params WHERE id = 1');
  const parsed = row ? JSON.parse(row.params) : {};
  cache = mergeParams(DEFAULT_PARAMS, parsed);
  return cache;
}

function getCachedParams() {
  return cache ?? mergeParams(DEFAULT_PARAMS, {});
}

async function getParams() {
  if (!cache) return loadParams();
  return cache;
}

async function setParams(params, updatedBy) {
  const db = getDb();
  const now = new Date().toISOString();
  const mergedParams = mergeParams(DEFAULT_PARAMS, params);
  const paramsStr = JSON.stringify(mergedParams);

  const existing = await db.get('SELECT id FROM game_params WHERE id = 1');
  if (existing) {
    await db.run(
      'UPDATE game_params SET params = ?, updated_at = ?, updated_by = ? WHERE id = 1',
      [paramsStr, now, updatedBy]
    );
  } else {
    await db.run(
      'INSERT INTO game_params (id, params, updated_at, updated_by) VALUES (1, ?, ?, ?)',
      [paramsStr, now, updatedBy]
    );
  }

  cache = mergedParams;
  return mergedParams;
}

module.exports = { getParams, setParams, getCachedParams, loadParams, DEFAULT_PARAMS };
