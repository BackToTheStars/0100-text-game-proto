const crypto = require('crypto');
const { ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { ADDRESS_LENGTH, CODE_LENGTH } = require('../../../config/game/code');
const { getError } = require('../../core/services/errors');
const { createGenerationCache } = require('../../core/services/generationCache');
const Game = require('../models/Game');

const randomHex = (length) =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

const MAX_ATTEMPTS = 100;

// Первое сгенерированное значение, которое не занято; null после attempts попыток.
const pickFree = async (generate, isTaken, attempts = MAX_ATTEMPTS) => {
  for (let i = 0; i < attempts; i++) {
    const value = generate();
    if (!(await isTaken(value))) {
      return value;
    }
  }
  return null;
};

// Адреса и коды делят одно пространство имён (у публичной игры код посетителя
// равен адресу), поэтому новое значение не должно совпадать ни с одним адресом
// и ни с одним кодом базы. Проверка по базе, а не по кэшу.
const isHashTaken = async (hash) =>
  !!(await Game.exists({ $or: [{ hash }, { 'codes.hash': hash }] }));

const generateAddress = async () => {
  const hash = await pickFree(() => randomHex(ADDRESS_LENGTH), isHashTaken);
  if (!hash) {
    throw getError(
      'Не удалось подобрать свободный адрес игры. Попробуйте ещё раз.',
      500
    );
  }
  return hash;
};

// Между проверкой адреса по базе и save() его может занять параллельный запрос,
// поэтому повторяется весь шаг «новый адрес → save».
const ADDRESS_COLLISION_RETRIES = 5;

const isAddressCollisionError = (err) =>
  !!err && err.code === 11000 && !!(err.keyPattern && err.keyPattern.hash);

const withAddressRetry = async (
  attempt,
  { retries = ADDRESS_COLLISION_RETRIES, isCollision = isAddressCollisionError } = {}
) => {
  for (let tries = 0; ; tries++) {
    try {
      return await attempt();
    } catch (e) {
      if (isCollision(e) && tries < retries) {
        continue;
      }
      throw e;
    }
  }
};

const generateCode = async () => {
  const hash = await pickFree(() => randomHex(CODE_LENGTH), isHashTaken);
  if (!hash) {
    throw getError(
      'Не удалось сгенерировать уникальный код доступа. Попробуйте ещё раз.',
      500
    );
  }
  return hash;
};

// Старые коды выдавались без проверки уникальности по базе: код, найденный
// больше чем в одной игре, — отказ, а не первая попавшаяся игра.
const findGameByCode = async (code) => {
  const games = await Game.find({ 'codes.hash': code }).limit(2);
  if (games.length > 1) {
    throw getError('Код доступа неоднозначен', 409, 'code-ambiguous');
  }
  return games[0] || null;
};

// Словарь «адрес → игра» по полю hash. Коды доступа сюда не входят: по коду
// игра резолвится только через /codes/login.
const buildAddressIndex = async () => {
  const list = await Game.find({ hash: { $exists: true } })
    .select({ _id: true, hash: true })
    .lean();
  const d = {};
  const duplicated = new Set();
  for (const game of list) {
    if (!game.hash) {
      continue;
    }
    if (d[game.hash] && '' + d[game.hash] !== '' + game._id) {
      console.warn(
        `hash duplicated: ${game.hash} ids: ${d[game.hash]}, ${game._id} (адрес неоднозначен, не резолвится)`
      );
      duplicated.add(game.hash);
      continue;
    }
    d[game.hash] = game._id;
  }
  return { d, duplicated };
};

const addressIndex = createGenerationCache(buildAddressIndex);

const clearGamesCache = () => addressIndex.clear();

const getInfo = async (hash) => {
  const { d: addresses, duplicated } = await addressIndex.get();
  // Адрес, на который претендует больше одной игры, не резолвится ни в одну:
  // молчаливый выбор «первой» однажды увёл удаление по ссылке в чужую игру.
  if (duplicated.has(hash)) {
    return { ambiguous: true };
  }
  if (addresses[hash]) {
    return {
      gameId: addresses[hash],
      role: ROLE_GAME_VISITOR,
    };
  }
  return {};
};

module.exports = {
  randomHex,
  pickFree,
  generateAddress,
  generateCode,
  findGameByCode,
  getInfo,
  clearGamesCache,
  ADDRESS_COLLISION_RETRIES,
  isAddressCollisionError,
  withAddressRetry,
};
