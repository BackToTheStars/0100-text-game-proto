const Game = require('../../game/models/Game');
const Turn = require('../../game/models/Turn');
const GameClass = require('../../game/models/GameClass');
const Line = require('../../game/models/Line');
const Snapshot = require('../models/Snapshot');

const TYPE_GAME = 'game';

const createGameSnapshot = async (gameId) => {
  const game = await Game.findById(gameId);
  const turns = await Turn.find({ gameId });
  const gameClasses = await GameClass.find({ gameId });
  const lines = await Line.find({ gameId });
  const snapshot = new Snapshot({
    typeName: TYPE_GAME,
    params: {
      gameId,
    },
    info: {
      game,
      turns,
      gameClasses,
      lines,
    },
  });
  await snapshot.save();
  return snapshot;
};

module.exports = {
  TYPE_GAME,
  createGameSnapshot,
};
