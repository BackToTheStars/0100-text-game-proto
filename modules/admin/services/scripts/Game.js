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

const CODE_HASH_LENGTH_FILTER = { codeHashLength: { $exists: true } };
const CODE_HASH_LENGTH_UNSET = { $unset: { codeHashLength: 1 } };
// codeHashLength вне схемы — обычный updateMany молча срежет $unset без этого.
const CODE_HASH_LENGTH_UPDATE_OPTIONS = { strict: false };

const checkCodeHashLength = async () => {
  const count = await Game.countDocuments(CODE_HASH_LENGTH_FILTER);
  return [true, `${count} games with codeHashLength found`];
};

const removeCodeHashLength = async () => {
  const result = await Game.updateMany(
    CODE_HASH_LENGTH_FILTER,
    CODE_HASH_LENGTH_UNSET,
    CODE_HASH_LENGTH_UPDATE_OPTIONS
  );
  return [true, `codeHashLength removed from ${result.modifiedCount} games`];
};

const checkCodeViewports = async () => {
  const gamesWithViewports = await Game.find({
    $or: [
      { 'codes.viewportPointX': { $exists: true } },
      { 'codes.viewportPointY': { $exists: true } },
    ],
  });
  return [
    true,
    `${gamesWithViewports.length} games with viewports in codes found`,
  ];
};

const removeCodeViewports = async () => {
  const gamesWithViewports = await Game.find({
    $or: [
      { 'codes.viewportPointX': { $exists: true } },
      { 'codes.viewportPointY': { $exists: true } },
    ],
  });

  let games = 0;
  let codes = 0;
  for (const game of gamesWithViewports) {
    const newCodes = [];
    for (const code of game.codes) {
      if (
        code.viewportPointX !== undefined ||
        code.viewportPointY !== undefined
      ) {
        codes += 1;
        newCodes.push({
          ...code.toObject(),
          viewportPointX: undefined,
          viewportPointY: undefined,
        });
      } else {
        newCodes.push(code);
      }
    }

    game.codes = newCodes;
    game.markModified('codes');
    await game.save();
    games += 1;
  }

  return [true, `${games} games updated. ${codes} codes updated.`];
};

module.exports = {
  checkZeroPoints,
  removeZeroPoints,
  checkGamesWithoutTurns,
  updateGamesCache,
  checkOldLines,
  removeOldLines,
  checkCodeViewports,
  removeCodeViewports,
  checkCodeHashLength,
  removeCodeHashLength,
  CODE_HASH_LENGTH_FILTER,
  CODE_HASH_LENGTH_UNSET,
  CODE_HASH_LENGTH_UPDATE_OPTIONS,
};
