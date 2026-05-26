// Build the settlement payload broadcast to every client when god view opens
// the结算畫面. Times are stored/transmitted as UTC ISO, with a pre-formatted
// Asia/Taipei string as the primary display value.

const TAIPEI_FORMATTER = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatTaipei(iso) {
  if (!iso) return null;
  // zh-TW gives "2026/05/16 22:30:45" → normalise separators
  return TAIPEI_FORMATTER.format(new Date(iso)).replace(/\//g, '-');
}

function buildSettlement(game) {
  const history = game.aggregateState?.roundHistory || [];
  const last = history[history.length - 1];
  const outcome = last && last.allOk ? 'success' : 'fail';
  const endedAt = game.endedAt || new Date().toISOString();

  return {
    gameId: game.id,
    name: game.name,
    outcome,
    finalOpinion: game.aggregateState.opinion,
    finalAttack: game.aggregateState.attackProb,
    totalRounds: game.rounds.length,
    roundHistory: history,
    players: game.players,
    endedAt,
    endedAtTaipei: formatTaipei(endedAt),
  };
}

module.exports = { buildSettlement, formatTaipei };
