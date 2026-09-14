const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { randomHex, pickFree } = require('../../modules/game/services/security');
const { ADDRESS_LENGTH, CODE_LENGTH } = require('../../config/game/code');

// Генераторы адреса игры и кода доступа без базы: формат, повтор на занятом
// значении, отказ при исчерпании попыток. Запуск: npm test (node --test).

describe('randomHex', () => {
  it('address is six hex characters, code is eight, and they differ in length', () => {
    assert.equal(ADDRESS_LENGTH, 6);
    assert.equal(CODE_LENGTH, 8);
    assert.match(randomHex(ADDRESS_LENGTH), /^[0-9a-f]{6}$/);
    assert.match(randomHex(CODE_LENGTH), /^[0-9a-f]{8}$/);
    assert.match(randomHex(3), /^[0-9a-f]{3}$/);
  });

  it('does not repeat itself over a hundred draws', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      seen.add(randomHex(CODE_LENGTH));
    }
    assert.equal(seen.size, 100);
  });
});

describe('pickFree', () => {
  it('returns the first value that is not taken', async () => {
    const value = await pickFree(() => 'a', () => false);
    assert.equal(value, 'a');
  });

  it('draws again while the value is taken', async () => {
    const draws = ['a', 'a', 'b', 'c'];
    let calls = 0;
    const value = await pickFree(
      () => draws[calls++],
      (candidate) => candidate === 'a'
    );
    assert.equal(value, 'b');
    assert.equal(calls, 3);
  });

  it('accepts an asynchronous check', async () => {
    const draws = ['taken', 'free'];
    let calls = 0;
    const value = await pickFree(
      () => draws[calls++],
      async (candidate) => candidate === 'taken'
    );
    assert.equal(value, 'free');
  });

  it('gives up with null after the attempt limit', async () => {
    let calls = 0;
    const value = await pickFree(
      () => `v${calls++}`,
      () => true,
      5
    );
    assert.equal(value, null);
    assert.equal(calls, 5);
  });
});
