const crypto = require('crypto');
const { ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { getError } = require('../../core/services/errors');
const Game = require('../models/Game');

// @todo: заменить на кэширование
let games;

// Случайная часть хеша кода. Криптостойкий источник вместо Math.random:
// коды короткие (extraLength по умолчанию 6 hex), и предсказуемый PRNG
// позволял бы их угадывать.
const getRandHex = (exp) => {
  return crypto
    .randomBytes(Math.ceil(exp / 2))
    .toString('hex')
    .slice(0, exp);
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

// Сгенерировать хеш кода, уникальный в рамках игры: не совпадающий ни с базовым
// хешем игры, ни с хешами уже существующих кодов. Предотвращает коллизию хешей,
// при которой codeLogin выбирал первый код с этим хешем → эскалация роли (баг #1).
const MAX_HASH_ATTEMPTS = 100;
const hashUniqueForGame = (game, extraLength) => {
  const taken = new Set([hashFunc(game._id)]);
  for (const code of game.codes || []) {
    if (code.hash) {
      taken.add(code.hash);
    }
  }
  for (let i = 0; i < MAX_HASH_ATTEMPTS; i++) {
    const hash = hashFunc(game._id, extraLength);
    if (!taken.has(hash)) {
      return hash;
    }
  }
  throw getError(
    'Не удалось сгенерировать уникальный код. Увеличьте длину кода (codeLength).',
    500
  );
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
            if (d[hash] && '' + d[hash] !== '' + game._id) {
              // Не валим резолвинг для всего сервера из-за одной "грязной" игры
              // со старой коллизией: логируем и оставляем первое отображение.
              console.warn(
                `hash duplicated: ${hash} ids: ${d[hash]}, ${game._id} (оставлено первое)`
              );
              continue;
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
  hashUniqueForGame,
  getInfo,
  getHashByGame,
  clearGamesCache,
};
