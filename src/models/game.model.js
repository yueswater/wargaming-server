const { v4: uuidv4 } = require('uuid');

const games = new Map();

function makePlayerSlot(gameRole) {
  return {
    gameRole,
    userId: null,
    username: null,
    displayName: null,
    connected: false,
  };
}

function createGame({ name, hostUserId } = {}) {
  const game = {
    id: uuidv4(),
    name: name || '台積電危機談判',
    status: 'lobby',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hostUserId: hostUserId || null,
    endedAt: null,
    settlementShownAt: null,
    currentRoundNumber: 0,
    players: {
      tsmc: makePlayerSlot('tsmc'),
      gov: makePlayerSlot('gov'),
      us: makePlayerSlot('us'),
      thinktank: makePlayerSlot('thinktank'),
    },
    rounds: [],
    aggregateState: {
      opinion: 60,
      attackProb: 60,
      roundHistory: [],
    },
  };
  games.set(game.id, game);
  return game;
}

function getGame(id) {
  return games.get(id) || null;
}

function getActiveGame() {
  let lobbyGame = null;
  let recentCompleted = null;
  for (const game of games.values()) {
    if (game.status === 'active') return game;
    if (game.status === 'lobby' && !lobbyGame) lobbyGame = game;
    if (game.status === 'completed') {
      if (
        !recentCompleted ||
        new Date(game.updatedAt) > new Date(recentCompleted.updatedAt)
      ) {
        recentCompleted = game;
      }
    }
  }
  // Priority: active > lobby > most recently completed. Surfacing the finished
  // game lets god view show the 結算畫面 button and players see their result.
  return lobbyGame || recentCompleted;
}

function getAllGames() {
  return Array.from(games.values()).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );
}

function deleteGame(id) {
  return games.delete(id);
}

module.exports = { createGame, getGame, getActiveGame, getAllGames, deleteGame };
