const { v4: uuidv4 } = require('uuid');
const { createGame, getGame, deleteGame } = require('../models/game.model');
const { listUsers } = require('../models/user.model');

function makeRound(roundNumber) {
  return {
    id: uuidv4(),
    roundNumber,
    phase: 'collecting',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    submissions: { tsmc: null, gov: null, us: null, thinktank: null },
    mergedDecision: null,
    result: null,
  };
}

async function createAndStartGame({ name, hostUserId, connectedUserIds }) {
  const game = createGame({ name, hostUserId });

  try {
    const users = await listUsers();
    const roleUsers = users.filter(
      (u) => u.gameRole && connectedUserIds.includes(u.id),
    );

    for (const u of roleUsers) {
      if (game.players[u.gameRole]) {
        game.players[u.gameRole] = {
          gameRole: u.gameRole,
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          connected: true,
        };
      }
    }

    const roles = ['tsmc', 'gov', 'us', 'thinktank'];
    for (const role of roles) {
      if (!game.players[role].userId) {
        throw new Error(`${role} 席位沒有在線玩家，無法開始`);
      }
    }

    game.status = 'active';
    game.currentRoundNumber = 1;
    game.rounds.push(makeRound(1));
    game.updatedAt = new Date().toISOString();
    return game;
  } catch (err) {
    // Remove the partial game so it doesn't appear as a zombie lobby game
    deleteGame(game.id);
    throw err;
  }
}

function getCurrentRound(game) {
  return (
    game.rounds.find((r) => r.roundNumber === game.currentRoundNumber) || null
  );
}

function advanceToNextRound(game) {
  game.currentRoundNumber += 1;
  game.rounds.push(makeRound(game.currentRoundNumber));
  game.updatedAt = new Date().toISOString();
}

module.exports = { createAndStartGame, getCurrentRound, advanceToNextRound };
