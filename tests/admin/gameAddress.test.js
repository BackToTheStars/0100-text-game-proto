const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  legacyAddressFromId,
  planAddresses,
} = require('../../modules/admin/services/scripts/GameAddress');

// План миграции адреса без базы: кому проставить вычисленный адрес, кого
// пропустить и почему. Запуск: npm test (node --test).

const id = (tail) => `66a3da300b474f60ae07d${tail}`;

describe('legacyAddressFromId', () => {
  it('is the last three characters of the id', () => {
    assert.equal(legacyAddressFromId(id('6d1')), '6d1');
    assert.equal(legacyAddressFromId({ toString: () => 'abc123' }), '123');
  });
});

describe('planAddresses', () => {
  it('leaves games that already have an address alone', () => {
    const plan = planAddresses([
      { _id: id('aaa'), hash: 'a1b2c3', codes: [{ hash: 'a1b2c3' }] },
      { _id: id('bbb'), hash: 'bbb', codes: [{ hash: 'bbb' }] },
    ]);
    assert.deepEqual(plan, { missing: 0, assign: [], skipped: [] });
  });

  it('assigns the computed address; its own visitor code equal to it is not a clash', () => {
    const plan = planAddresses([
      { _id: id('6d1'), codes: [{ hash: '6d1' }, { hash: '6d1abc' }] },
    ]);
    assert.equal(plan.missing, 1);
    assert.deepEqual(plan.assign, [{ _id: id('6d1'), hash: '6d1' }]);
    assert.deepEqual(plan.skipped, []);
  });

  it('skips both games whose ids share the tail and names the other one', () => {
    const plan = planAddresses([
      { _id: id('6d1'), codes: [{ hash: '6d1' }] },
      { _id: '5f0000000000000000000' + '6d1', codes: [] },
      { _id: id('506'), codes: [] },
    ]);
    assert.deepEqual(plan.assign, [{ _id: id('506'), hash: '506' }]);
    assert.equal(plan.skipped.length, 2);
    assert.deepEqual(plan.skipped[0], {
      _id: id('6d1'),
      hash: '6d1',
      takenBy: ['5f00000000000000000006d1'],
    });
    assert.deepEqual(plan.skipped[1].takenBy, [id('6d1')]);
  });

  it('skips a game whose computed address is the address or a code of another game', () => {
    const plan = planAddresses([
      { _id: id('abc'), codes: [] },
      { _id: id('111'), hash: 'abc', codes: [] },
      { _id: id('def'), codes: [] },
      { _id: id('222'), hash: '222', codes: [{ hash: 'def' }] },
    ]);
    assert.deepEqual(plan.assign, []);
    assert.deepEqual(
      plan.skipped.map(({ hash, takenBy }) => [hash, takenBy]),
      [
        ['abc', [id('111')]],
        ['def', [id('222')]],
      ]
    );
  });

  it('is a no-op once the plan has been applied', () => {
    const games = [
      { _id: id('6d1'), codes: [{ hash: '6d1' }] },
      { _id: id('506'), codes: [] },
    ];
    const first = planAddresses(games);
    for (const { _id, hash } of first.assign) {
      games.find((game) => game._id === _id).hash = hash;
    }
    assert.deepEqual(planAddresses(games), {
      missing: 0,
      assign: [],
      skipped: [],
    });
  });
});
