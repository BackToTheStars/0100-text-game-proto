const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyTurnOps,
  changesRows,
  TURN_OPS_FIELDS,
} = require('../../modules/game/services/turnOps');
const { TURN_OPS_MAX } = require('../../config/turn');
// Побайтная копия brain-platform/scripts/turn-ops/cases.json — общая с клиентом.
const { cases } = require('./fixtures/turnOpsCases.json');

// Операции над ходом (тело POST /turns/:id/ops) без базы. Запуск: npm test.

const rows = () => [
  { id: 'a', left: 'A left', right: 'A right' },
  { id: 'b', left: 'B left', right: 'B right' },
];

const rejects400 = (ops, pattern) =>
  assert.throws(
    () => applyTurnOps({ rows: rows() }, ops),
    (error) => error.statusCode === 400 && pattern.test(error.message),
    JSON.stringify(ops)
  );

const setFields = (fields) => [{ op: 'fields.set', fields }];

describe('applyTurnOps: shared cases', () => {
  for (const { name, turn, ops, expect } of cases) {
    it(name, () => {
      if (expect.error) {
        assert.throws(
          () => applyTurnOps(turn, ops),
          (error) => error.statusCode === expect.error
        );
        return;
      }
      assert.deepEqual(applyTurnOps(turn, ops), {
        rows: expect.rows,
        fields: expect.fields || {},
      });
    });
  }
});

describe('applyTurnOps', () => {
  it('does not mutate the turn or the operations', () => {
    const turn = { rows: rows(), header: 'old' };
    const ops = [
      { op: 'row.set', id: 'a', left: 'changed' },
      { op: 'row.insert', after: 'a', row: { id: 'n', left: 'new' } },
      { op: 'row.remove', id: 'b' },
      { op: 'fields.set', fields: { header: 'new' } },
    ];
    const before = JSON.stringify({ turn, ops });
    applyTurnOps(turn, ops);
    assert.equal(JSON.stringify({ turn, ops }), before);
  });

  it('takes a list of the maximum length and refuses one more', () => {
    const op = { op: 'row.set', id: 'a', left: 'x' };
    assert.equal(TURN_OPS_MAX, 500);
    assert.equal(
      applyTurnOps({ rows: rows() }, Array(TURN_OPS_MAX).fill(op)).rows.length,
      2
    );
    rejects400(Array(TURN_OPS_MAX + 1).fill(op), /at most 500/);
  });

  it('refuses an operation that is not an object with a known name', () => {
    rejects400([null], /object/);
    rejects400(['row.remove'], /object/);
    rejects400([[{ op: 'row.remove', id: 'a' }]], /object/);
    rejects400([{ id: 'a', left: 'x' }], /object/);
    rejects400([{ op: 'constructor' }], /Unknown operation/);
    rejects400([{ op: 'rows.set', id: 'a', left: 'x' }], /Unknown operation/);
  });

  it('refuses a broken row.insert', () => {
    rejects400([{ op: 'row.insert', after: null }], /row\.id/);
    rejects400(
      [{ op: 'row.insert', after: null, row: { id: 'n', right: 5 } }],
      /side/
    );
    rejects400([{ op: 'row.insert', after: '', row: { id: 'n' } }], /after/);
    rejects400([{ op: 'row.insert', after: 7, row: { id: 'n' } }], /after/);
    rejects400(
      [{ op: 'row.insert', after: undefined, row: { id: 'n' } }],
      /after/
    );
  });

  it('fields.set takes exactly the listed fields', () => {
    assert.deepEqual(TURN_OPS_FIELDS, [
      'header',
      'dontShowHeader',
      'date',
      'sourceUrl',
      'languages',
      'paragraph',
    ]);
    for (const key of [
      'rows',
      'contentType',
      'opsVersion',
      'rowsVersion',
      '_id',
      'gameId',
      'x',
      'width',
      'markdown',
      'quotes',
      'constructor',
    ]) {
      rejects400(setFields({ [key]: 'x' }), /not allowed/);
    }
    rejects400(setFields(JSON.parse('{"__proto__":{"rows":[]}}')), /not allowed/);
  });

  it('fields.set checks the type of every value', () => {
    rejects400(setFields({ header: null }), /"header"/);
    rejects400(setFields({ dontShowHeader: 'true' }), /"dontShowHeader"/);
    rejects400(setFields({ date: 5 }), /"date"/);
    rejects400(setFields({ sourceUrl: ['x'] }), /"sourceUrl"/);
    rejects400(setFields({ languages: ['en', 'ru'] }), /"languages"/);
    rejects400(setFields({ languages: { left: null } }), /"languages"/);
    rejects400(setFields({ paragraph: { insert: 'x' } }), /"paragraph"/);
    rejects400(setFields(null), /non-empty object/);
    rejects400(setFields([{ header: 'x' }]), /non-empty object/);
    rejects400([{ op: 'fields.set' }], /non-empty object/);
  });

  it('fields.set with one language replaces the pair', () => {
    const { fields } = applyTurnOps(
      { rows: rows(), languages: { left: 'en', right: 'ru' } },
      setFields({ languages: { left: 'de' } })
    );
    assert.deepEqual(fields, { languages: { left: 'de' } });
  });

  it('tells row operations from field ones', () => {
    assert.equal(changesRows(setFields({ header: 'x' })), false);
    assert.equal(changesRows([{ op: 'row.remove', id: 'zzz' }]), true);
    assert.equal(
      changesRows([
        ...setFields({ header: 'x' }),
        { op: 'row.set', id: 'a', left: 'x' },
      ]),
      true
    );
  });
});
