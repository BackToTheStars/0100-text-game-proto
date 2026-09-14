const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  isAddressCollisionError,
  withAddressRetry,
  ADDRESS_COLLISION_RETRIES,
} = require('../../modules/game/services/security');

const collisionError = () => {
  const err = new Error('E11000 duplicate key');
  err.code = 11000;
  err.keyPattern = { hash: 1 };
  return err;
};

// Признак «это гонка за адресом игры», а не любой другой E11000 в games
// (например по будущему уникальному полю). Форма ошибки снята зондом на
// реальном mongodb-драйвере (mongoose 8 / mongodb 6): MongoServerError,
// code: 11000, keyPattern называет поле. Запуск: npm test (node --test).

describe('isAddressCollisionError', () => {
  it('is true for E11000 whose keyPattern names hash', () => {
    const err = { code: 11000, keyPattern: { hash: 1 } };
    assert.equal(isAddressCollisionError(err), true);
  });

  it('is false for E11000 on a different field', () => {
    const err = { code: 11000, keyPattern: { 'codes.hash': 1 } };
    assert.equal(isAddressCollisionError(err), false);
  });

  it('is false without a duplicate-key code', () => {
    const err = { name: 'ValidationError', keyPattern: { hash: 1 } };
    assert.equal(isAddressCollisionError(err), false);
  });

  it('is false when keyPattern is missing (older driver shapes)', () => {
    const err = { code: 11000, message: 'E11000 ... index: hash_1 ...' };
    assert.equal(isAddressCollisionError(err), false);
  });

  it('is false for null/undefined', () => {
    assert.equal(isAddressCollisionError(null), false);
    assert.equal(isAddressCollisionError(undefined), false);
  });

  it('the retry limit is a small positive number', () => {
    assert.ok(ADDRESS_COLLISION_RETRIES > 0 && ADDRESS_COLLISION_RETRIES <= 10);
  });
});

describe('withAddressRetry', () => {
  it('returns the result once attempt stops colliding', async () => {
    let calls = 0;
    const result = await withAddressRetry(async () => {
      calls++;
      if (calls < 3) {
        throw collisionError();
      }
      return 'address-ok';
    });
    assert.equal(result, 'address-ok');
    assert.equal(calls, 3);
  });

  it('gives up after the retry limit and rethrows the collision', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withAddressRetry(
          async () => {
            calls++;
            throw collisionError();
          },
          { retries: 2 }
        ),
      (err) => err.code === 11000
    );
    // 1 первая попытка + 2 повтора = 3 вызова attempt
    assert.equal(calls, 3);
  });

  it('does not retry an error that is not an address collision', async () => {
    let calls = 0;
    const other = new Error('not a collision');
    await assert.rejects(
      () =>
        withAddressRetry(async () => {
          calls++;
          throw other;
        }),
      other
    );
    assert.equal(calls, 1);
  });

  it('never calls attempt twice for a single success', async () => {
    let calls = 0;
    await withAddressRetry(async () => {
      calls++;
      return 'ok';
    });
    assert.equal(calls, 1);
  });
});
