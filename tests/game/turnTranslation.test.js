const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const {
  createTurn,
  updateTurnRows,
} = require('../../modules/game/controllers/Turn');
const { getTurns } = require('../../modules/lobby/controllers/LobbyController');
const {
  AVAILABLE_TEMPLATES,
  TEMPLATE_TRANSLATION,
  WIDGET_TRANSLATION,
} = require('../../config/turn');

// Ход перевода в схеме Turn и PUT /turns/:id/rows без базы: коллекция модели
// подменена, как в turnMarkdown.test.js. Запуск: npm test.

const gameId = '66a3da300b474f60ae07d6d0';
const turnId = '66a3da300b474f60ae07d6d1';

const ROWS = [
  { id: 'r1', left: '  # Title\n\nindented line\n', right: '  # Заголовок\n\nстрока с отступом\n' },
  { id: 'r2', left: '==🔴quote==\n\n- item', right: '' },
];

const body = (extra = {}) => ({
  contentType: 'translation',
  paragraph: [{ insert: 'Title\n' }],
  header: 'Header',
  x: 24,
  y: 48,
  width: 768,
  height: 600,
  rows: ROWS,
  languages: { left: ' en ', right: 'ru' },
  ...extra,
});

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

describe('translation turn in the Turn schema', () => {
  let stored;

  beforeEach(() => {
    stored = null;
    mock.method(Game, 'findById', async () => ({
      timeOfGameUpdate: async () => {},
    }));
    mock.method(Turn.collection, 'insertOne', async (doc) => {
      stored = doc;
      return { acknowledged: true, insertedId: doc._id };
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const create = (turn) => call(createTurn, { gameInfo: { gameId }, body: turn });

  it('translation is an available content type and widget', () => {
    assert.equal(TEMPLATE_TRANSLATION, 'translation');
    assert.equal(WIDGET_TRANSLATION, 'translation');
    assert.ok(AVAILABLE_TEMPLATES.includes('translation'));
  });

  it('create stores the rows as they are, without subdocument ids', async () => {
    const { item } = await create(body());
    assert.equal(item.contentType, 'translation');
    assert.deepEqual(item.rows, ROWS);
    assert.deepEqual(asJson(stored.rows), ROWS);
    assert.equal(item.rowsVersion, 0);
  });

  it('create trims the languages and keeps them as a plain pair', async () => {
    const { item } = await create(body());
    assert.deepEqual(item.languages, { left: 'en', right: 'ru' });
    assert.deepEqual(asJson(stored.languages), { left: 'en', right: 'ru' });
  });

  it('a long row is not cut', async () => {
    const left = '==🔴text==\n'.repeat(100000);
    const { item } = await create(body({ rows: [{ id: 'r', left, right: '' }] }));
    assert.equal(item.rows[0].left.length, left.length);
  });

  it('a turn of another type gets no languages and an empty rows list', async () => {
    const { item } = await create(
      body({ contentType: 'comment', rows: undefined, languages: undefined })
    );
    assert.equal('languages' in item, false);
    assert.deepEqual(item.rows, []);
  });

  it('the lobby feed leaves rows and their version out, nothing else', async () => {
    const doc = Turn.hydrate({ ...body(), _id: turnId, rowsVersion: 3 });
    mock.method(Game, 'find', () =>
      lookup([{ _id: new mongoose.Types.ObjectId(gameId) }])
    );
    const find = mock.method(Turn, 'find', () => lookup([doc]));
    const { items } = await call(getTurns, {
      query: { codes: 'aaaaaa:bbbbbbbb', mode: 'chrono' },
    });
    const projection = find.mock.calls[0].arguments[1];
    assert.deepEqual(projection, { rows: false, rowsVersion: false });
    assert.equal(items[0].header, 'Header');
    assert.equal(items[0].paragraph[0].insert, 'Title\n');
  });

  it('the by-game feed projects rows and their version out of the lookup', async () => {
    mock.method(Game, 'find', () =>
      lookup([{ _id: new mongoose.Types.ObjectId(gameId) }])
    );
    const aggregate = mock.method(Game, 'aggregate', async () => []);
    await call(getTurns, {
      query: { codes: 'aaaaaa:bbbbbbbb', mode: 'byGame' },
    });
    const pipe = aggregate.mock.calls[0].arguments[0];
    const lookupStage = pipe.find((stage) => stage.$lookup).$lookup;
    const project = lookupStage.pipeline.find((stage) => stage.$project);
    assert.deepEqual(project.$project, { rows: false, rowsVersion: false });
  });
});

describe('PUT /turns/:id/rows', () => {
  let stored;
  let reads;
  let writes;
  let gameUpdated;

  const seed = (extra = {}) => {
    stored = {
      ...body(),
      _id: new mongoose.Types.ObjectId(turnId),
      gameId: new mongoose.Types.ObjectId(gameId),
      rowsVersion: 5,
      ...extra,
    };
  };

  const stripUndefined = (value) => JSON.parse(JSON.stringify(value));

  beforeEach(() => {
    reads = 0;
    writes = [];
    gameUpdated = 0;
    seed();
    mock.method(Game, 'findById', async () => ({
      timeOfGameUpdate: async () => {
        gameUpdated += 1;
      },
    }));
    mock.method(Turn.collection, 'findOne', async () => {
      reads += 1;
      return stored && stripUndefined(stored);
    });
    mock.method(Turn.collection, 'findOneAndUpdate', async (filter, update) => {
      writes.push({ filter: stripUndefined(filter), update: stripUndefined(update) });
      const current = stored.rowsVersion === undefined ? null : stored.rowsVersion;
      if (filter.rowsVersion !== current) {
        return null;
      }
      stored = stripUndefined({
        ...stored,
        ...update.$set,
        rowsVersion: (stored.rowsVersion || 0) + update.$inc.rowsVersion,
      });
      return stored;
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const put = (ops) =>
    call(updateTurnRows, {
      gameInfo: { gameId },
      params: { id: turnId },
      body: ops,
    });

  it('applies the operations to the stored rows and bumps the version', async () => {
    const result = await put({
      upsert: [{ id: 'r2', right: 'перевод' }, { id: 'r3', left: 'new' }],
    });
    assert.deepEqual(result, { success: true, rowsVersion: 6 });
    assert.equal(reads, 1);
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].filter.rowsVersion, 5);
    assert.deepEqual(writes[0].update.$inc, { rowsVersion: 1 });
    assert.deepEqual(stored.rows, [
      { id: 'r1', left: ROWS[0].left, right: ROWS[0].right },
      { id: 'r2', left: ROWS[1].left, right: 'перевод' },
      { id: 'r3', left: 'new', right: '' },
    ]);
    assert.equal(stored.rowsVersion, 6);
    assert.equal(gameUpdated, 1);
  });

  it('writes only rows and the version, scoped to the game', async () => {
    await put({ remove: ['r1'] });
    const { $set, $inc, ...rest } = writes[0].update;
    // $setOnInsert.createdAt добавляют timestamps mongoose; без upsert он не пишет.
    assert.deepEqual(Object.keys(rest), ['$setOnInsert']);
    assert.deepEqual(Object.keys($set).sort(), ['rows', 'updatedAt']);
    assert.deepEqual($inc, { rowsVersion: 1 });
    assert.equal(String(writes[0].filter.gameId), gameId);
    assert.equal(String(writes[0].filter._id), turnId);
    assert.equal(stored.header, 'Header');
  });

  it('retries on a version miss and succeeds on the fresh rows', async () => {
    let bumped = false;
    mock.method(Turn.collection, 'findOne', async () => {
      reads += 1;
      if (!bumped) {
        // Между чтением и записью другой игрок добавил ряд и поднял версию.
        bumped = true;
        const snapshot = stripUndefined(stored);
        stored = {
          ...stored,
          rows: [...stored.rows, { id: 'other', left: 'theirs', right: '' }],
          rowsVersion: stored.rowsVersion + 1,
        };
        return snapshot;
      }
      return stripUndefined(stored);
    });
    const result = await put({ upsert: [{ id: 'r1', left: 'mine' }] });
    assert.deepEqual(result, { success: true, rowsVersion: 7 });
    assert.equal(reads, 2);
    assert.equal(writes.length, 2);
    assert.equal(writes[0].filter.rowsVersion, 5);
    assert.equal(writes[1].filter.rowsVersion, 6);
    assert.deepEqual(
      stored.rows.map((row) => [row.id, row.left]),
      [['r1', 'mine'], ['r2', ROWS[1].left], ['other', 'theirs']]
    );
  });

  it('gives up with 409 after three misses', async () => {
    mock.method(Turn.collection, 'findOneAndUpdate', async () => null);
    await assert.rejects(
      put({ upsert: [{ id: 'r1', left: 'mine' }] }),
      (error) =>
        error.statusCode === 409 &&
        error.errorCode === 'rows-changed' &&
        /changed by someone else/.test(error.message)
    );
    assert.equal(reads, 3);
    assert.equal(gameUpdated, 0);
  });

  it('a turn created before the version field is matched by null', async () => {
    seed({ rowsVersion: undefined });
    const result = await put({ upsert: [{ id: 'r1', right: 'x' }] });
    assert.equal(writes[0].filter.rowsVersion, null);
    assert.deepEqual(result, { success: true, rowsVersion: 1 });
  });

  it('answers 404 when the turn is not in the game', async () => {
    stored = null;
    await assert.rejects(
      put({ remove: ['r1'] }),
      (error) => error.statusCode === 404
    );
    assert.equal(writes.length, 0);
  });

  it('answers 400 on a malformed body without touching the turn', async () => {
    await assert.rejects(
      put({ upsert: [{ id: 'r1' }], order: ['r1'] }),
      (error) => error.statusCode === 400 && /order/.test(error.message)
    );
    await assert.rejects(
      put({}),
      (error) => error.statusCode === 400
    );
    assert.equal(writes.length, 0);
    assert.equal(gameUpdated, 0);
  });
});
