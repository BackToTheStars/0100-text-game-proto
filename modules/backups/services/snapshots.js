const Game = require('../../../models/Game');
const Turn = require('../../../models/Turn');
const GameClass = require('../../../models/GameClass');
const Snapshot = require('../models/Snapshot');

const TYPE_GAME = 'game';

const createGameSnapshot = async (gameId) => {
  const game = await Game.findById(gameId);
  const turns = await Turn.find({ gameId });
  const gameClasses = await GameClass.find({ gameId });
  const snapshot = new Snapshot({
    typeName: TYPE_GAME,
    params: {
      gameId,
    },
    info: {
      game,
      turns,
      gameClasses,
    },
  });
  await snapshot.save();
  return snapshot;
};

module.exports = {
  TYPE_GAME,
  createGameSnapshot,
};
