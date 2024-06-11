const Turn = require('../../../game/models/Turn');
const Game = require('../../../game/models/Game');
const { clearGamesCache } = require('../../../game/services/security');

const checkZeroPoints = async () => {
  const zeroPointTurnsCount = await Turn.countDocuments({
    contentType: 'zero-point',
  });
  return [true, `${zeroPointTurnsCount} zero-point turns found`];
};

const removeZeroPoints = async () => {
  const result = await Turn.deleteMany({
    contentType: 'zero-point',
  });
  return [true, `${result.deletedCount} zero-point turns deleted`];
};

const checkGamesWithoutTurns = async () => {
  const allGames = await Game.find({});
  const gamesWithoutTurnsNames = [];

  for (const game of allGames) {
    const turnsCount = await Turn.countDocuments({ gameId: game._id });
    if (turnsCount === 0) {
      gamesWithoutTurnsNames.push(game.name);
    }
  }

  return [true, gamesWithoutTurnsNames];
};

const updateGamesCache = async () => {
  clearGamesCache();
  return [true, 'Games cache updated.'];
};

const checkOldLines = async () => {
  const oldLineGamesCount = await Game.countDocuments({
    redLogicLines: { $exists: true, $ne: null },
  });
  return [true, `${oldLineGamesCount} games with old lines found`];
};

const removeOldLines = async () => {
  await Game.updateMany(
    { redLogicLines: { $exists: true, $ne: null } },
    { $unset: { redLogicLines: 1 } }
  );
  return [true, `Old lines removed from games`];
};

module.exports = {
  checkZeroPoints,
  removeZeroPoints,
  checkGamesWithoutTurns,
  updateGamesCache,
  checkOldLines,
  removeOldLines,
};
