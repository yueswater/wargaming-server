const { getGame, getActiveGame } = require('../models/game.model');
const { createAndStartGame } = require('../services/gameState.service');
const { submitDecision } = require('../services/roundResolver.service');
const { getConnectedUserIds } = require('../socket/presence');

function safeGame(game) {
  if (!game) return null;
  return {
    id: game.id,
    name: game.name,
    status: game.status,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    currentRoundNumber: game.currentRoundNumber,
    players: game.players,
    rounds: game.rounds.map((r) => ({
      ...r,
      // strip raw submission payloads from list view — send them only on full get
      submissions: Object.fromEntries(
        Object.entries(r.submissions).map(([role, sub]) => [
          role,
          sub ? { role: sub.role, submittedAt: sub.submittedAt } : null,
        ]),
      ),
    })),
    aggregateState: game.aggregateState,
  };
}

// POST /api/games/start — create + seat + start a new game
exports.start = async (req, res) => {
  try {
    const hostUserId = req.user.id;
    const connectedUserIds = getConnectedUserIds();
    const game = await createAndStartGame({
      name: req.body.name,
      hostUserId,
      connectedUserIds,
    });
    res.status(201).json(safeGame(game));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/games/active — get the current active/lobby game
exports.getActive = (req, res) => {
  const game = getActiveGame();
  if (!game) return res.json(null);
  res.json(safeGame(game));
};

// GET /api/games/:id — get a specific game
exports.get = (req, res) => {
  const game = getGame(req.params.id);
  if (!game) return res.status(404).json({ error: '找不到此兵推' });
  res.json(safeGame(game));
};

// POST /api/games/:id/rounds/:roundNumber/submissions — submit a decision
exports.submit = (req, res) => {
  try {
    const { id, roundNumber } = req.params;
    const { gameRole, payload } = req.body;
    if (!gameRole || !payload) {
      return res.status(400).json({ error: '缺少 gameRole 或 payload' });
    }

    const game = getGame(id);
    if (!game) return res.status(404).json({ error: '找不到此兵推' });

    const round = game.rounds.find((r) => r.roundNumber === Number(roundNumber));
    if (!round) return res.status(404).json({ error: '找不到此回合' });

    const result = submitDecision(id, req.user.id, gameRole, payload);

    // Emit socket events via app-level io
    const io = req.app.get('io');
    if (io) {
      // Broadcast submission status (no payloads revealed)
      io.emit('round:submission-status', {
        gameId: id,
        roundNumber: Number(roundNumber),
        submittedRoles: Object.entries(result.round.submissions)
          .filter(([, v]) => v !== null)
          .map(([role]) => role),
      });

      if (result.allSubmitted) {
        io.emit('round:resolved', {
          gameId: id,
          roundNumber: Number(roundNumber),
          result: result.round.result,
          mergedDecision: result.round.mergedDecision,
          gameStatus: result.game.status,
          nextRoundNumber:
            result.game.status === 'active' ? result.game.currentRoundNumber : null,
          aggregateState: result.game.aggregateState,
        });
      }
    }

    res.json({
      submittedRoles: Object.entries(result.round.submissions)
        .filter(([, v]) => v !== null)
        .map(([role]) => role),
      phase: result.round.phase,
      result: result.round.result || null,
      gameStatus: result.game.status,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
