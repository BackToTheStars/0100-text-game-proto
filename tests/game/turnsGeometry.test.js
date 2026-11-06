const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Turn = require('../../modules/game/models/Turn');
const {
  GEOMETRY_FIELDS,
  toGeometryItem,
} = require('../../modules/game/services/turnsGeometry');

// Элемент ответа GET /turns/geometry без базы. Запуск: npm test.

describe('toGeometryItem', () => {
  it('maps a turn to position, size and createdAt as an ISO string', () => {
    const createdAt = new Date('2026-10-07T09:30:00.000Z');
    assert.deepEqual(
      toGeometryItem({
        _id: '66a3',
        x: 50,
        y: -24,
        width: 768,
        height: 600,
        contentType: 'comment',
        createdAt,
        header: 'not in the item',
      }),
      {
        _id: '66a3',
        contentType: 'comment',
        position: { x: 50, y: -24 },
        size: { width: 768, height: 600 },
        z: 0,
        createdAt: '2026-10-07T09:30:00.000Z',
      }
    );
  });

  it('gives the stacking order z as a number, 0 when the field is missing or not a number', () => {
    const base = { _id: '1', x: 0, y: 0, width: 1, height: 1, contentType: 'comment' };
    assert.equal(toGeometryItem({ ...base, z: 3 }).z, 3);
    assert.equal(toGeometryItem({ ...base, z: -2.5 }).z, -2.5);
    assert.equal(toGeometryItem(base).z, 0);
    assert.equal(toGeometryItem({ ...base, z: null }).z, 0);
    assert.equal(toGeometryItem({ ...base, z: '4' }).z, 0);
    assert.equal(toGeometryItem({ ...base, z: Number.NaN }).z, 0);
  });

  it('reads a mongoose document the way the controller gets it', () => {
    const createdAt = new Date('2026-10-07T09:30:00.000Z');
    const doc = new Turn({
      contentType: 'picture',
      paragraph: [{ insert: '\n' }],
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      createdAt,
    });
    const item = toGeometryItem(doc);
    assert.equal(item._id, doc._id);
    assert.deepEqual(item.position, { x: 10, y: 20 });
    assert.deepEqual(item.size, { width: 300, height: 200 });
    assert.equal(item.createdAt, '2026-10-07T09:30:00.000Z');
  });

  it('reads z from a mongoose document, 0 for an old turn without it', () => {
    const turn = { contentType: 'comment', paragraph: [{ insert: '\n' }], width: 1, height: 1 };
    assert.equal(toGeometryItem(new Turn({ ...turn, z: 7 })).z, 7);
    const old = new Turn(turn);
    assert.equal(old.z, undefined);
    assert.equal(toGeometryItem(old).z, 0);
  });

  it('normalises a date string and gives null for a missing or broken date', () => {
    const base = { _id: '1', x: 0, y: 0, width: 1, height: 1, contentType: 'comment' };
    assert.equal(
      toGeometryItem({ ...base, createdAt: '2026-10-07T12:30:00+03:00' }).createdAt,
      '2026-10-07T09:30:00.000Z'
    );
    assert.equal(toGeometryItem(base).createdAt, null);
    assert.equal(toGeometryItem({ ...base, createdAt: null }).createdAt, null);
    assert.equal(toGeometryItem({ ...base, createdAt: 'not a date' }).createdAt, null);
  });
});

describe('GEOMETRY_FIELDS', () => {
  it('selects every field the item is built from', () => {
    for (const field of ['_id', 'x', 'y', 'z', 'width', 'height', 'contentType', 'createdAt']) {
      assert.equal(GEOMETRY_FIELDS[field], true, field);
    }
  });
});
