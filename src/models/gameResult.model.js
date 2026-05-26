const { getDb } = require('../db');

function deriveOutcome(game) {
  const history = game.aggregateState?.roundHistory || [];
  const last = history[history.length - 1];
  return last && last.allOk ? 'success' : 'fail';
}

// Persist a finished game in a single idempotent write. ended_at is stored as a
// UTC ISO string (consistent with the rest of the codebase); callers/UI render
// it in Asia/Taipei. Safe to call more than once for the same game.
async function saveGameResult(game) {
  const db = getDb();
  const endedAt = game.endedAt || new Date().toISOString();
  game.endedAt = endedAt;

  await db.run(
    `INSERT INTO game_results
       (id, name, outcome, final_opinion, final_attack, total_rounds,
        players, rounds, aggregate_state, created_at, ended_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       outcome = EXCLUDED.outcome,
       final_opinion = EXCLUDED.final_opinion,
       final_attack = EXCLUDED.final_attack,
       total_rounds = EXCLUDED.total_rounds,
       players = EXCLUDED.players,
       rounds = EXCLUDED.rounds,
       aggregate_state = EXCLUDED.aggregate_state,
       ended_at = EXCLUDED.ended_at`,
    [
      game.id,
      game.name,
      deriveOutcome(game),
      game.aggregateState.opinion,
      game.aggregateState.attackProb,
      game.rounds.length,
      JSON.stringify(game.players),
      JSON.stringify(game.rounds),
      JSON.stringify(game.aggregateState),
      game.createdAt,
      endedAt,
    ],
  );

  return endedAt;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function listGameResults(limit = 200) {
  const db = getDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const rows = await db.all(
    `SELECT id, name, outcome, final_opinion, final_attack, total_rounds,
            aggregate_state, created_at, ended_at
       FROM game_results
      ORDER BY ended_at DESC
      LIMIT ?`,
    [safeLimit],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    outcome: row.outcome,
    finalOpinion: Number(row.final_opinion),
    finalAttack: Number(row.final_attack),
    totalRounds: Number(row.total_rounds),
    roundHistory: parseJson(row.aggregate_state, {}).roundHistory || [],
    createdAt: row.created_at,
    endedAt: row.ended_at,
  }));
}

module.exports = { saveGameResult, listGameResults };
