const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const {
  createTurn,
  getTurnsByIds,
  updateTurn,
} = require('../../modules/game/controllers/Turn');
const { getTurns } = require('../../modules/lobby/controllers/LobbyController');
const {
  AVAILABLE_TEMPLATES,
  TEMPLATE_TRANSLATION,
  WIDGET_TRANSLATION,
} = require('../../config/turn');

// Ход перевода в схеме Turn, лента лобби и PUT /turns/:id без базы: коллекция
// модели подменена, как в turnMarkdown.test.js. Запуск: npm test.

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
    assert.equal(item.opsVersion, 0);
  });

  it('create ignores a version sent in the body', async () => {
    const { item } = await create(body({ opsVersion: 9, rowsVersion: 7 }));
    assert.equal(item.opsVersion, 0);
    assert.equal(stored.opsVersion, 0);
    assert.equal('rowsVersion' in stored, false);
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

  it('the lobby feed leaves rows and the version out, nothing else', async () => {
    const doc = Turn.hydrate({ ...body(), _id: turnId, opsVersion: 3 });
    mock.method(Game, 'find', () =>
      lookup([{ _id: new mongoose.Types.ObjectId(gameId) }])
    );
    const find = mock.method(Turn, 'find', () => lookup([doc]));
    const { items } = await call(getTurns, {
      query: { codes: 'aaaaaa:bbbbbbbb', mode: 'chrono' },
    });
    const projection = find.mock.calls[0].arguments[1];
    assert.deepEqual(projection, { rows: false, opsVersion: false });
    assert.equal(items[0].header, 'Header');
    assert.equal(items[0].paragraph[0].insert, 'Title\n');
  });

  it('the by-game feed projects rows and the version out of the lookup', async () => {
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
    assert.deepEqual(project.$project, { rows: false, opsVersion: false });
  });

  it('the canvas load carries the rows and the version', async () => {
    const docs = [
      Turn.hydrate({ ...body(), _id: turnId, opsVersion: 3 }),
      Turn.hydrate({ ...body(), _id: '66a3da300b474f60ae07d6d2' }),
    ];
    const find = mock.method(Turn, 'find', () => lookup(docs));
    const { items } = await call(getTurnsByIds, {
      gameInfo: { gameId },
      query: {},
    });
    const projection = find.mock.calls[0].arguments[1];
    assert.equal('rows' in projection, false);
    assert.equal('opsVersion' in projection, false);
    assert.deepEqual(items[0].rows, ROWS);
    assert.equal(items[0].opsVersion, 3);
    // Ход, записанный до поля, отдаётся с версией 0.
    assert.equal(items[1].opsVersion, 0);
  });
});

describe('PUT /turns/:id', () => {
  let stored;
  let writes;
  let gameUpdated;

  beforeEach(() => {
    writes = [];
    gameUpdated = 0;
    stored = {
      ...body({ languages: { left: 'en', right: 'ru' } }),
      _id: new mongoose.Types.ObjectId(turnId),
      gameId: new mongoose.Types.ObjectId(gameId),
      opsVersion: 5,
    };
    mock.method(Game, 'findById', async () => ({
      timeOfGameUpdate: async () => {
        gameUpdated += 1;
      },
    }));
    mock.method(
      Turn.collection,
      'findOneAndUpdate',
      async (filter, update, { projection = {} }) => {
        writes.push({ filter, update, projection });
        stored = { ...stored, ...update.$set };
        const answer = { ...stored };
        for (const [key, shown] of Object.entries(projection)) {
          if (!shown) {
            delete answer[key];
          }
        }
        return answer;
      }
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const put = (turn) =>
    call(updateTurn, {
      gameInfo: { gameId },
      params: { id: turnId },
      body: turn,
    });

  it('answers without the rows, the other fields are in place', async () => {
    const { item } = await put({ header: 'New header', x: 96 });
    assert.deepEqual(writes[0].projection, { rows: false });
    assert.equal('rows' in item, false);
    assert.equal(item.header, 'New header');
    assert.equal(item.x, 96);
    assert.equal(item.opsVersion, 5);
    assert.deepEqual(item.languages, { left: 'en', right: 'ru' });
    assert.equal(item.paragraph[0].insert, 'Title\n');
    assert.deepEqual(stored.rows, ROWS);
    assert.equal(gameUpdated, 1);
  });

  it('refuses a body with the rows or a version and writes nothing', async () => {
    const bodies = [
      { header: 'x', rows: [{ id: 'r1', left: 'overwritten', right: '' }] },
      { header: 'x', rows: [] },
      { header: 'x', opsVersion: 0 },
      { header: 'x', rowsVersion: 6 },
    ];
    for (const turn of bodies) {
      await assert.rejects(
        put(turn),
        (error) =>
          error.statusCode === 400 && /is not accepted here/.test(error.message),
        JSON.stringify(turn)
      );
    }
    assert.equal(writes.length, 0);
    assert.equal(gameUpdated, 0);
    assert.equal(stored.header, 'Header');
  });
});
