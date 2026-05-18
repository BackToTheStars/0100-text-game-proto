const { ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { getError } = require('../../core/services/errors');
const Game = require('../models/Game');

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
    games = await Game.find()
      .select({ _id: true, 'codes.hash': true })
      .lean()
      .then((games) => {
        // console.log({ games });
        const d = {}
        for (const game of games) {
          const hashes = [hashFunc(game._id)];
          if (game.codes) {
            for (const code of game.codes) {
              if (code.hash) {
                hashes.push(code.hash);
              }
            }
          }
          for (const hash of hashes) {
            if (d[hash] && d[hash] !== game._id) {
              throw getError(`hash duplicated: ${hash} ids: ${d[hash]}, ${game._id}`, 400);
            }
            d[hash] = game._id;
          }
        }
        return d
      });
  }
  if (games[hash]) {
    return {
      gameId: games[hash],
      role: ROLE_GAME_VISITOR,
    };
  }
  return {};
};

module.exports = {
  hashFunc,
  getInfo,
  getHashByGame,
  clearGamesCache,
};
