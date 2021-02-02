const Game = require('../models/Game');
const User = require('../models/User');

// @todo: заменить на кэширование
let games;

const getRandHex = (exp) => {
  return Math.floor(Math.random() * Math.pow(16, exp))
    .toString(16)
    .padStart(exp, '0');
};

const hashFunc = (_id, extraLength = 0) => {
  // реализацию можно изменить в любой момент
  if (extraLength) {
    return ('' + _id).slice(-3) + getRandHex(extraLength);
  } else {
    return ('' + _id).slice(-3);
  }
};

const getHashByGame = (game) => {
  return hashFunc(game._id);
};

const clearGamesCache = () => (games = null);

const getInfo = async (hash) => {
  if (!games) {
    games = await Game.find(); //
  }
  for (let game of games) {
    if (hashFunc(game._id) === hash) {
      const gameId = game._id;
      return {
        gameId,
        roles: [
          User.roles.ROLE_VIEW,
          // User.roles.ROLE_EDIT, // @todo: remove
        ],
      };
    }
  }
  return {};
};

module.exports = {
  hashFunc,
  getInfo,
  getHashByGame,
  clearGamesCache,
};
