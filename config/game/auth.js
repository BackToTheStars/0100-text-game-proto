const AUTH_VERSION = '0.0.2';

// Срок жизни токена игры — одно место на оба обработчика, его выписывающих.
// Миллисекунды, а не дни: e2e нужен токен, истекающий за секунды.
const GAME_TOKEN_TTL_DEFAULT = 28 * 24 * 3600 * 1000;
// Секунда — меньшее в JWT не выразить, exp там в целых секундах; год сверху,
// чтобы лишний ноль в переменной не выдал практически вечный токен.
const GAME_TOKEN_TTL_MIN = 1000;
const GAME_TOKEN_TTL_MAX = 365 * 24 * 3600 * 1000;

const parseTtl = (raw) => {
  const n = Number(raw);
  return Number.isInteger(n) &&
    n >= GAME_TOKEN_TTL_MIN &&
    n <= GAME_TOKEN_TTL_MAX
    ? n
    : null;
};

// Отказ старта при негодном значении — по образцу assertEnvLoginRateLimit;
// зовётся из server.js до создания приложения.
const assertEnvGameTokenTtl = () => {
  const raw = process.env.GAME_TOKEN_TTL_MS;
  if (raw === undefined || raw === '') {
    return;
  }
  if (parseTtl(raw) === null) {
    throw new Error(
      `GAME_TOKEN_TTL_MS должен быть целым числом миллисекунд в диапазоне [${GAME_TOKEN_TTL_MIN}, ${GAME_TOKEN_TTL_MAX}], получено: ${raw}`
    );
  }
};

const GAME_TOKEN_TTL_MS =
  parseTtl(process.env.GAME_TOKEN_TTL_MS) ?? GAME_TOKEN_TTL_DEFAULT;

module.exports = {
  AUTH_VERSION,
  GAME_TOKEN_TTL_MIN,
  GAME_TOKEN_TTL_MAX,
  GAME_TOKEN_TTL_MS,
  assertEnvGameTokenTtl,
};
