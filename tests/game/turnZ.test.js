const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const {
  createTurn,
  updateCoordinates,
} = require('../../modules/game/controllers/Turn');

// Поле z (порядок наложения) без базы: коллекция и bulkWrite подменены.
// Запуск: npm test.

const gameId = '66a3da300b474f60ae07d6d0';
const turnId = '66a3da300b474f60ae07d6d1';

const asJson = (value) => JSON.parse(JSON.stringify(value));

const call = async (handler, req) => {
  let sent;
  let failure;
  const res = {
    json: (payload) => {
      sent = payload;
      return res;
    },
  };
  await handler(req, res, (err) => {
    failure = err;
  });
  if (failure) {
    throw failure;
  }
  return asJson(sent);
};

describe('z in the Turn schema', () => {
  let stored;
  let operations;

  beforeEach(() => {
    stored = null;
    operations = null;
    mock.method(Game, 'findById', async () => ({
      timeOfGameUpdate: async () => {},
    }));
    mock.method(Turn.collection, 'insertOne', async (doc) => {
      stored = doc;
      return { acknowledged: true, insertedId: doc._id };
    });
    mock.method(Turn, 'bulkWrite', async (ops) => {
      operations = ops;
      return { matchedCount: ops.length, modifiedCount: ops.length };
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const create = (turn) => call(createTurn, { gameInfo: { gameId }, body: turn });

  const move = (turns) =>
    call(updateCoordinates, { gameInfo: { gameId }, body: { turns } });

  const newTurn = (extra = {}) => ({
    contentType: 'comment',
    paragraph: [{ insert: 'text\n' }],
    x: 24,
    y: 48,
    width: 768,
    height: 600,
    ...extra,
  });

  it('create stores and returns z from the body', async () => {
    const { item } = await create(newTurn({ z: 5 }));
    assert.equal(item.z, 5);
    assert.equal(stored.z, 5);
  });

  it('create without z leaves the field unset', async () => {
    const { item } = await create(newTurn());
    assert.equal('z' in item, false);
    assert.equal('z' in stored, false);
  });

  it('coordinates update writes z, negative and fractional included', async () => {
    await move([
      { _id: turnId, z: 3 },
      { _id: '66a3da300b474f60ae07d6d2', z: -1.5, x: 10 },
    ]);
    assert.deepEqual(operations[0].updateOne.update.$set, { z: 3 });
    assert.deepEqual(operations[1].updateOne.update.$set, { x: 10, z: -1.5 });
  });

  it('coordinates update ignores a z that is not a number', async () => {
    await move([
      { _id: turnId, x: 1, z: '7' },
      { _id: '66a3da300b474f60ae07d6d2', x: 2, z: null },
      { _id: '66a3da300b474f60ae07d6d3', x: 3, z: Number.NaN },
      { _id: '66a3da300b474f60ae07d6d4', x: 4 },
    ]);
    for (const op of operations) {
      assert.equal('z' in op.updateOne.update.$set, false);
    }
  });
});
