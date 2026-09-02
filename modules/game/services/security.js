const crypto = require('crypto');
const mongoose = require('mongoose');
const { ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { getError } = require('../../core/services/errors');
const Game = require('../models/Game');

// @todo: заменить на кэширование
let games;
// Хеши, на которые претендует больше одной игры. Такой хеш не резолвится ни в
// одну из них: молчаливый выбор «первой» однажды увёл удаление по ссылке в
// чужую игру.
let ambiguousHashes;

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

const clearGamesCache = () => {
  games = null;
  ambiguousHashes = null;
};

// Словарь «хеш → игра» по всем хешам: и адресам игр, и кодам доступа.
const buildHashIndex = async () => {
  const list = await Game.find().select({ _id: true, 'codes.hash': true }).lean();
  const d = {};
  const duplicated = new Set();
  for (const game of list) {
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
        // со старой коллизией, но и не выбираем за пользователя, какая из
        // них "настоящая": помечаем хеш неоднозначным, вызывающий ответит
        // отказом. Разбирается такая пара вручную — переименованием,
        // удалением или сознательным решением оставить как есть.
        console.warn(
          `hash duplicated: ${hash} ids: ${d[hash]}, ${game._id} (хеш неоднозначен, не резолвится)`
        );
        duplicated.add(hash);
        continue;
      }
      d[hash] = game._id;
    }
  }
  return { d, duplicated };
};

const getInfo = async (hash) => {
  if (!games) {
    const { d, duplicated } = await buildHashIndex();
    games = d;
    ambiguousHashes = duplicated;
  }
  if (ambiguousHashes.has(hash)) {
    return { ambiguous: true };
  }
  if (games[hash]) {
    return {
      gameId: games[hash],
      role: ROLE_GAME_VISITOR,
    };
  }
  return {};
};

// Подобрать _id, чей адрес (последние три символа) ещё не занят ни одной
// игрой. Адресов всего 4096, поэтому без подбора новая игра рано или поздно
// садится на чужой адрес и становится недостижимой по своей же ссылке.
// Занятые адреса читаются из базы, а не из кэша: кэш мог устареть, а цена
// ошибки — навсегда потерянная ссылка на игру.
const generateFreeGameId = async () => {
  const list = await Game.find().select({ _id: true }).lean();
  const taken = new Set(list.map((game) => hashFunc(game._id)));
  for (let i = 0; i < MAX_HASH_ATTEMPTS; i++) {
    const _id = new mongoose.Types.ObjectId();
    if (!taken.has(hashFunc(_id))) {
      return _id;
    }
  }
  throw getError(
    'Не удалось подобрать свободный адрес для новой игры. Попробуйте ещё раз.',
    500
  );
};

module.exports = {
  hashFunc,
  hashUniqueForGame,
  generateFreeGameId,
  getInfo,
  getHashByGame,
  clearGamesCache,
};
