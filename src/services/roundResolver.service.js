const { getGame } = require('../models/game.model');
const { getCurrentRound, advanceToNextRound } = require('./gameState.service');
const { mergeSubmissions } = require('./submissionMerger.service');
const { calculateGame } = require('./gameEngine');

const MAX_ROUNDS = 3;

function submitDecision(gameId, userId, gameRole, payload) {
  const game = getGame(gameId);
  if (!game) throw new Error('找不到房間');
  if (game.status !== 'active') throw new Error('遊戲尚未開始或已結束');

  const round = getCurrentRound(game);
  if (!round) throw new Error('找不到當前回合');
  if (round.phase !== 'collecting') throw new Error('此回合已鎖定，無法再提交');

  const slot = game.players[gameRole];
  if (!slot || slot.userId !== userId) throw new Error('您不是此角色的玩家');

  round.submissions[gameRole] = {
    role: gameRole,
    userId,
    submittedAt: new Date().toISOString(),
    payload,
  };

  const roles = ['tsmc', 'gov', 'us', 'thinktank'];
  const allSubmitted = roles.every((r) => round.submissions[r] !== null);

  if (allSubmitted) {
    _resolveRound(game, round);
  }

  game.updatedAt = new Date().toISOString();
  return { game, round, allSubmitted };
}

function _resolveRound(game, round) {
  round.phase = 'locked';

  const merged = mergeSubmissions({
    tsmc: round.submissions.tsmc.payload,
    gov: round.submissions.gov.payload,
    us: round.submissions.us.payload,
    thinktank: round.submissions.thinktank.payload,
  });
  round.mergedDecision = merged;

  const result = calculateGame(merged);
  round.result = result;
  round.resolvedAt = new Date().toISOString();
  round.phase = 'resolved';

  game.aggregateState.opinion = result.finalOpinion;
  game.aggregateState.attackProb = result.finalAttack;
  game.aggregateState.roundHistory.push({
    roundNumber: round.roundNumber,
    finalOpinion: result.finalOpinion,
    finalAttack: result.finalAttack,
    allOk: result.allOk,
    usVictoryOk: result.usVictoryOk,
  });

  if (result.allOk || game.currentRoundNumber >= MAX_ROUNDS) {
    game.status = 'completed';
  } else {
    advanceToNextRound(game);
  }
}

module.exports = { submitDecision };
