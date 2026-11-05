const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { applyRowOps } = require('../../modules/game/services/rows');

// Операции над рядами хода перевода (тело PUT /turns/:id/rows) без базы.
// Запуск: npm test.

const rows = () => [
  { id: 'a', left: 'A left', right: 'A right' },
  { id: 'b', left: 'B left', right: 'B right' },
  { id: 'c', left: 'C left', right: 'C right' },
];

const rejects400 = (ops, pattern) =>
  assert.throws(
    () => applyRowOps(rows(), ops),
    (error) => error.statusCode === 400 && pattern.test(error.message)
  );

describe('applyRowOps', () => {
  it('replaces only the sent side of an existing row', () => {
    const result = applyRowOps(rows(), {
      upsert: [{ id: 'b', right: 'B translated\n\nsecond paragraph' }],
    });
    assert.deepEqual(result, [
      { id: 'a', left: 'A left', right: 'A right' },
      { id: 'b', left: 'B left', right: 'B translated\n\nsecond paragraph' },
      { id: 'c', left: 'C left', right: 'C right' },
    ]);
  });

  it('an empty string clears a side, an absent one keeps it', () => {
    const result = applyRowOps(rows(), { upsert: [{ id: 'a', left: '' }] });
    assert.deepEqual(result[0], { id: 'a', left: '', right: 'A right' });
  });

  it('appends a new row at the end when there is no order', () => {
    const result = applyRowOps(rows(), {
      upsert: [{ id: 'd', left: '  indented md' }],
    });
    assert.equal(result.length, 4);
    assert.deepEqual(result[3], { id: 'd', left: '  indented md', right: '' });
  });

  it('removes rows by id and ignores an id already gone', () => {
    const result = applyRowOps(rows(), { remove: ['b', 'zzz'] });
    assert.deepEqual(
      result.map((row) => row.id),
      ['a', 'c']
    );
  });

  it('reorders by a permutation of the resulting ids', () => {
    const result = applyRowOps(rows(), {
      upsert: [{ id: 'd', left: 'D' }],
      remove: ['a'],
      order: ['d', 'c', 'b'],
    });
    assert.deepEqual(
      result.map((row) => row.id),
      ['d', 'c', 'b']
    );
    assert.deepEqual(result[2], { id: 'b', left: 'B left', right: 'B right' });
  });

  it('does not mutate the stored rows', () => {
    const stored = rows();
    const before = JSON.stringify(stored);
    applyRowOps(stored, {
      upsert: [{ id: 'a', left: 'changed' }, { id: 'd', left: 'new' }],
      remove: ['b'],
      order: ['d', 'c', 'a'],
    });
    assert.equal(JSON.stringify(stored), before);
  });

  it('starts from an empty list when the turn has no rows yet', () => {
    assert.deepEqual(applyRowOps(undefined, { upsert: [{ id: 'a', left: 'x' }] }), [
      { id: 'a', left: 'x', right: '' },
    ]);
  });

  it('rejects an order that is not a permutation of the result', () => {
    rejects400({ order: ['a', 'b'] }, /order/);
    rejects400({ order: ['a', 'b', 'c', 'd'] }, /order/);
    rejects400({ remove: ['a'], order: ['a', 'b', 'c'] }, /order/);
    rejects400({ order: ['a', 'b', 'b'] }, /repeats/);
  });

  it('rejects duplicate ids, empty ids and non-string sides', () => {
    rejects400({ upsert: [{ id: 'a' }, { id: 'a', left: 'x' }] }, /repeats/);
    rejects400({ upsert: [{ id: '', left: 'x' }] }, /non-empty string/);
    rejects400({ upsert: [{ id: 7, left: 'x' }] }, /non-empty string/);
    rejects400({ upsert: [{ id: 'a', left: ['x'] }] }, /left of row "a"/);
    rejects400({ upsert: [{ id: 'a', right: 1 }] }, /right of row "a"/);
    rejects400({ remove: ['a', 'a'] }, /repeats/);
    rejects400({ remove: [null] }, /non-empty string/);
  });

  it('rejects a malformed body and an empty set of operations', () => {
    rejects400(null, /object/);
    rejects400([], /object/);
    rejects400({}, /Nothing to apply/);
    rejects400({ upsert: [], remove: [] }, /Nothing to apply/);
    rejects400({ upsert: 'a' }, /array/);
    rejects400({ upsert: ['a'] }, /object/);
    rejects400({ remove: 'a' }, /array/);
  });

  it('rejects a row id that is both upserted and removed', () => {
    rejects400({ upsert: [{ id: 'a', left: 'x' }], remove: ['a'] }, /both/);
  });
});
