process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  isUsableAddress,
  requireGameAddress,
  indexFromGames,
} = require('../../modules/game/services/security');
const { resolveGameAccess } = require('../../modules/game/services/access');
const { issueGameToken } = require('../../modules/game/controllers/Code');

// Игра без пригодного адреса (окно миграции после выката или пропущенная
// миграцией игра): токен не выдаётся, отказ временный — 503 game-no-address.
// Там, где игра ищется по адресу, её нет в словаре, и она неотличима от
// удалённой — 404 game-not-found сохраняется. Без базы. Запуск: npm test.

const id = (tail) => `66a3da300b474f60ae07d${tail}`;
const isNoAddress = (err) =>
  err.statusCode === 503 && err.errorCode === 'game-no-address';

describe('isUsableAddress', () => {
  it('is a non-empty string and nothing else', () => {
    assert.equal(isUsableAddress('a3f9c1'), true);
    assert.equal(isUsableAddress('6d1'), true);
    for (const value of [undefined, null, '', 7, {}, []]) {
      assert.equal(isUsableAddress(value), false, JSON.stringify(value));
    }
  });
});

describe('requireGameAddress', () => {
  it('returns the address of a migrated game', () => {
    assert.equal(requireGameAddress({ _id: id('6d1'), hash: '6d1' }), '6d1');
  });

  it('refuses a game without a usable address with 503 game-no-address', () => {
    for (const game of [
      { _id: id('6d1') },
      { _id: id('6d1'), hash: null },
      { _id: id('6d1'), hash: '' },
      { _id: id('6d1'), hash: 7 },
      undefined,
    ]) {
      assert.throws(() => requireGameAddress(game), isNoAddress, JSON.stringify(game));
    }
  });
});

describe('issueGameToken', () => {
  const base = { code: '7c2e91b0', nickname: 'Оля', role: 3 };

  it('issues a token whose payload and info carry the address', () => {
    const result = issueGameToken({ ...base, game: { _id: id('6d1'), hash: 'a3f9c1' } });
    assert.equal(result.success, true);
    assert.equal(result.info.hash, 'a3f9c1');
    assert.equal(result.info.gameId, id('6d1'));
    const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
    assert.equal(decoded.data.hash, 'a3f9c1');
    assert.equal(decoded.data.role, 3);
  });

  it('does not issue a token for a game without an address (login by code in the migration window)', () => {
    for (const hash of [undefined, null, '']) {
      const game = hash === undefined ? { _id: id('6d1') } : { _id: id('6d1'), hash };
      assert.throws(() => issueGameToken({ ...base, game }), isNoAddress, String(hash));
    }
  });
});

describe('address index', () => {
  it('holds only games with a usable address, so an unmigrated game is not resolvable by ?hash=', () => {
    const { d, duplicated } = indexFromGames([
      { _id: id('aaa'), hash: 'aaa' },
      { _id: id('bbb') },
      { _id: id('ccc'), hash: null },
      { _id: id('ddd'), hash: '' },
      { _id: id('eee'), hash: 7 },
    ]);
    assert.deepEqual(Object.keys(d), ['aaa']);
    assert.equal(duplicated.size, 0);
  });
});

describe('resolveGameAccess on refresh', () => {
  const notInIndex = { resolveAddress: async () => ({}) };

  it('keeps the exact 404 for an address that resolves to no game (deleted or unmigrated alike)', async () => {
    await assert.rejects(
      () => resolveGameAccess({ hash: '6d1', token: 'x.y.z', requireToken: true }, notInIndex),
      (err) => err.statusCode === 404 && err.errorCode === 'game-not-found'
    );
  });

  it('never answers game-no-address itself: without a token on a known address it is token-missing', async () => {
    const known = { resolveAddress: async () => ({ gameId: id('6d1'), role: 1 }) };
    await assert.rejects(
      () => resolveGameAccess({ hash: '6d1', requireToken: true }, known),
      (err) => err.statusCode === 401 && err.errorCode === 'token-missing'
    );
  });
});
