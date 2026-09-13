const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { getError } = require('../../modules/core/services/errors');

// Срок жизни токена игры и отказ старта при негодном GAME_TOKEN_TTL_MS.
// Значение читается при загрузке модуля, поэтому каждый случай грузит конфиг
// заново со своим значением переменной. Запуск: npm test (node --test).
const AUTH_PATH = require.resolve('../../config/game/auth');

const loadAuth = (raw) => {
  const prev = process.env.GAME_TOKEN_TTL_MS;
  if (raw === undefined) {
    delete process.env.GAME_TOKEN_TTL_MS;
  } else {
    process.env.GAME_TOKEN_TTL_MS = raw;
  }
  delete require.cache[AUTH_PATH];
  try {
    return require('../../config/game/auth');
  } finally {
    if (prev === undefined) {
      delete process.env.GAME_TOKEN_TTL_MS;
    } else {
      process.env.GAME_TOKEN_TTL_MS = prev;
    }
    delete require.cache[AUTH_PATH];
  }
};

describe('game token ttl', () => {
  it('defaults to four weeks when the variable is unset', () => {
    const { GAME_TOKEN_TTL_MS } = loadAuth(undefined);
    assert.equal(GAME_TOKEN_TTL_MS, 28 * 24 * 3600 * 1000);
    assert.equal(GAME_TOKEN_TTL_MS, loadAuth('').GAME_TOKEN_TTL_MS);
  });

  it('takes the value from the variable when it is valid', () => {
    assert.equal(loadAuth('2000').GAME_TOKEN_TTL_MS, 2000);
    // Экспоненциальная запись проходит как число — так же, как у LOGIN_RATE_*.
    assert.equal(loadAuth('1e6').GAME_TOKEN_TTL_MS, 1000000);
    assert.equal(loadAuth('1000').GAME_TOKEN_TTL_MS, 1000);
    const { GAME_TOKEN_TTL_MAX } = loadAuth(undefined);
    assert.equal(
      loadAuth('' + GAME_TOKEN_TTL_MAX).GAME_TOKEN_TTL_MS,
      GAME_TOKEN_TTL_MAX
    );
  });

  it('falls back to the default when the variable is garbage', () => {
    // Значение негодное — старт всё равно откажет (см. ниже), но сам модуль
    // мусор в срок не пускает.
    assert.equal(loadAuth('abc').GAME_TOKEN_TTL_MS, 28 * 24 * 3600 * 1000);
  });

  it('refuses to start on a value outside the range, naming the variable', () => {
    const { GAME_TOKEN_TTL_MIN, GAME_TOKEN_TTL_MAX } = loadAuth(undefined);
    const bad = [
      'abc',
      '0',
      '-1',
      '2.5',
      '' + (GAME_TOKEN_TTL_MIN - 1),
      '' + (GAME_TOKEN_TTL_MAX + 1),
      ' ',
    ];
    for (const raw of bad) {
      const { assertEnvGameTokenTtl } = loadAuth(raw);
      assert.throws(
        () => {
          process.env.GAME_TOKEN_TTL_MS = raw;
          try {
            assertEnvGameTokenTtl();
          } finally {
            delete process.env.GAME_TOKEN_TTL_MS;
          }
        },
        (err) => err.message.includes('GAME_TOKEN_TTL_MS'),
        `expected a refusal naming the variable for ${JSON.stringify(raw)}`
      );
    }
  });

  it('lets the start through on an unset, empty and in-range value', () => {
    const { GAME_TOKEN_TTL_MIN, GAME_TOKEN_TTL_MAX } = loadAuth(undefined);
    const good = [
      undefined,
      '',
      '' + GAME_TOKEN_TTL_MIN,
      '2000',
      '' + GAME_TOKEN_TTL_MAX,
    ];
    for (const raw of good) {
      const { assertEnvGameTokenTtl } = loadAuth(raw);
      const prev = process.env.GAME_TOKEN_TTL_MS;
      if (raw === undefined) {
        delete process.env.GAME_TOKEN_TTL_MS;
      } else {
        process.env.GAME_TOKEN_TTL_MS = raw;
      }
      try {
        assertEnvGameTokenTtl();
      } finally {
        if (prev === undefined) {
          delete process.env.GAME_TOKEN_TTL_MS;
        } else {
          process.env.GAME_TOKEN_TTL_MS = prev;
        }
      }
    }
  });
});

describe('refusal error code', () => {
  it('carries the machine code when it is given', () => {
    const err = getError('Токен истёк', 401, 'token-expired');
    assert.equal(err.statusCode, 401);
    assert.equal(err.message, 'Токен истёк');
    assert.equal(err.errorCode, 'token-expired');
  });

  it('has no errorCode when it is not given', () => {
    const err = getError('Игра не найдена', 404);
    assert.equal(err.statusCode, 404);
    assert.equal('errorCode' in err, false);
  });
});
