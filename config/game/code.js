// Длина хеша кода игры.
// Параметр = кол-во случайных hex-символов (extraLength); полная длина кода =
// 3 (базовый префикс из id игры) + extraLength. Базовый хеш игры (URL `?hash=`,
// link-доступ) этим параметром НЕ управляется — он всегда равен последним 3 символам id.
const CODE_HASH_MIN = 3;
const CODE_HASH_MAX = 16;

// Дефолт берётся из GAME_ID_HASH_LENGTH, если он валиден; иначе 6.
const parseEnvDefault = () => {
  const raw = parseInt(process.env.GAME_ID_HASH_LENGTH, 10);
  if (Number.isInteger(raw) && raw >= CODE_HASH_MIN && raw <= CODE_HASH_MAX) {
    return raw;
  }
  return 6;
};

const CODE_HASH_DEFAULT = parseEnvDefault();

// Валидация значения из env при старте сервера: если задано, но вне диапазона —
// поднимать нельзя (иначе генерация кодов будет вне ожидаемых границ).
const assertEnvCodeHashLength = () => {
  if (process.env.GAME_ID_HASH_LENGTH === undefined || process.env.GAME_ID_HASH_LENGTH === '') {
    return;
  }
  const raw = parseInt(process.env.GAME_ID_HASH_LENGTH, 10);
  if (!Number.isInteger(raw) || raw < CODE_HASH_MIN || raw > CODE_HASH_MAX) {
    throw new Error(
      `GAME_ID_HASH_LENGTH должен быть целым числом в диапазоне [${CODE_HASH_MIN}, ${CODE_HASH_MAX}], получено: ${process.env.GAME_ID_HASH_LENGTH}`
    );
  }
};

// Привести произвольное входное значение (например, query-параметр) к валидной длине
// или вернуть null, если оно задано, но вне диапазона (вызывающий решает: 400 или дефолт).
const normalizeCodeHashLength = (value) => {
  if (value === undefined || value === null || value === '') {
    return CODE_HASH_DEFAULT;
  }
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < CODE_HASH_MIN || n > CODE_HASH_MAX) {
    return null;
  }
  return n;
};

module.exports = {
  CODE_HASH_MIN,
  CODE_HASH_MAX,
  CODE_HASH_DEFAULT,
  assertEnvCodeHashLength,
  normalizeCodeHashLength,
};
