const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const {
  createTurn,
  updateTurn,
  getTurnsByIds,
} = require('../../modules/game/controllers/Turn');
const { getTurns } = require('../../modules/lobby/controllers/LobbyController');
const adminTurns = require('../../modules/admin/controllers/Turn');

// Поле audioTitle в схеме Turn без базы: коллекция модели подменена, Mongoose
// кастует тело запроса и обновление как обычно, а до драйвера доходит то, что
// ушло бы в Mongo. Запуск: npm test.

const gameId = '66a3da300b474f60ae07d6d0';
const turnId = '66a3da300b474f60ae07d6d1';

const body = (extra = {}) => ({
  contentType: 'audio',
  paragraph: [{ insert: 'text\n' }],
  header: 'Header',
  x: 24,
  y: 48,
  width: 768,
  height: 600,
  ...extra,
});

// Ответ клиент видит как JSON, а не как документ Mongoose.
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

const lookup = (rows) => ({
  sort: () => rows,
  skip: () => lookup(rows),
  limit: () => lookup(rows),
  then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
});

describe('audioTitle in the Turn schema', () => {
  let stored;
  let updates;

  beforeEach(() => {
    stored = null;
    updates = [];
    mock.method(Game, 'findById', async () => ({
      timeOfGameUpdate: async () => {},
    }));
    mock.method(Turn.collection, 'insertOne', async (doc) => {
      stored = doc;
      return { acknowledged: true, insertedId: doc._id };
    });
    mock.method(Turn.collection, 'findOneAndUpdate', async (filter, update) => {
      updates.push({ filter, update });
      if (String(filter._id) !== String(stored._id)) {
        return null;
      }
      stored = { ...stored, ...update.$set };
      return stored;
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const create = (turn) =>
    call(createTurn, { gameInfo: { gameId }, body: turn });

  const update = (turn) =>
    call(updateTurn, {
      gameInfo: { gameId },
      params: { id: turnId },
      body: turn,
    });

  const seed = (extra = {}) => {
    stored = {
      ...body(),
      _id: new mongoose.Types.ObjectId(turnId),
      gameId: new mongoose.Types.ObjectId(gameId),
      ...extra,
    };
  };

  it('create stores and returns the title, trimmed', async () => {
    const { item } = await create(body({ audioTitle: '  Episode 1  ' }));
    assert.equal(item.audioTitle, 'Episode 1');
    assert.equal(stored.audioTitle, 'Episode 1');
  });

  it('create without the field leaves it unset', async () => {
    const { item } = await create(body());
    assert.equal('audioTitle' in item, false);
    assert.equal('audioTitle' in stored, false);
  });

  it('is accepted for a turn of any type', async () => {
    const { item } = await create(body({ contentType: 'comment', audioTitle: 'T' }));
    assert.equal(item.audioTitle, 'T');
  });

  it('update sets and returns the title, trimmed', async () => {
    seed();
    const { item } = await update(body({ audioTitle: ' Episode 2 ' }));
    assert.equal(updates[0].update.$set.audioTitle, 'Episode 2');
    assert.equal(item.audioTitle, 'Episode 2');
    assert.equal(stored.audioTitle, 'Episode 2');
  });

  it('update without the field keeps the stored title', async () => {
    seed({ audioTitle: 'Kept' });
    const { item } = await update(body({ header: 'Changed' }));
    assert.equal('audioTitle' in updates[0].update.$set, false);
    assert.equal(item.header, 'Changed');
    assert.equal(item.audioTitle, 'Kept');
    assert.equal(stored.audioTitle, 'Kept');
  });

  it('update with an empty string or null clears the title', async () => {
    seed({ audioTitle: 'Gone' });
    await update(body({ audioTitle: '   ' }));
    assert.equal(stored.audioTitle, '');
    seed({ audioTitle: 'Gone' });
    await update(body({ audioTitle: null }));
    assert.equal(stored.audioTitle, null);
  });

  it('turns by ids are read without a projection that could cut the field', async () => {
    const doc = Turn.hydrate({ ...body({ audioTitle: 'Read' }), _id: turnId });
    const find = mock.method(Turn, 'find', async () => [doc]);
    const { items } = await call(getTurnsByIds, {
      gameInfo: { gameId },
      query: { ids: turnId },
    });
    const projection = find.mock.calls[0].arguments[1];
    assert.ok(Object.values(projection).every((flag) => flag === false));
    assert.equal(items[0].audioTitle, 'Read');
  });

  it('the lobby turns feed returns whole documents', async () => {
    const doc = Turn.hydrate({ ...body({ audioTitle: 'Feed' }), _id: turnId });
    mock.method(Game, 'find', () =>
      lookup([{ _id: new mongoose.Types.ObjectId(gameId) }])
    );
    const find = mock.method(Turn, 'find', () => lookup([doc]));
    const { items } = await call(getTurns, {
      query: { codes: 'aaaaaa:bbbbbbbb', mode: 'chrono' },
    });
    assert.equal(find.mock.calls[0].arguments.length, 1);
    assert.equal(items[0].audioTitle, 'Feed');
  });

  it('the admin turn endpoints return whole documents', async () => {
    const doc = Turn.hydrate({ ...body({ audioTitle: 'Admin' }), _id: turnId });
    const find = mock.method(Turn, 'find', () => lookup([doc]));
    mock.method(Turn, 'countDocuments', async () => 1);
    mock.method(Turn, 'findById', async () => doc);

    const listed = await call(adminTurns.list, { query: {} });
    assert.equal(find.mock.calls[0].arguments.length, 1);
    assert.equal(listed.items[0].audioTitle, 'Admin');

    const single = await call(adminTurns.getById, { params: { id: turnId } });
    assert.equal(single.item.audioTitle, 'Admin');
  });
});
