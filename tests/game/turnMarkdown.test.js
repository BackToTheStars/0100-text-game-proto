const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const { createTurn, updateTurn, getTurnsByIds } = require('../../modules/game/controllers/Turn');
const { getTurns } = require('../../modules/lobby/controllers/LobbyController');
const { AVAILABLE_TEMPLATES, TEMPLATE_MD } = require('../../config/turn');
const { splitBlocks } = require('../../modules/game/services/mdBlocks');

// Статья md в схеме Turn без базы: текст хранится рядами одной колонкой, старое
// поле markdown делится при создании. Коллекция модели подменена, как в
// turnAudioTitle.test.js. Запуск: npm test.

const gameId = '66a3da300b474f60ae07d6d0';
const turnId = '66a3da300b474f60ae07d6d1';

const SOURCE =
  '  # Title\n\n   indented line\n==g quote== ^1664763801\n==y second==^1664763802\n\n- item\n';

const body = (extra = {}) => ({
  contentType: 'md',
  paragraph: [{ insert: 'plain\n' }],
  header: 'Header',
  x: 24,
  y: 48,
  width: 768,
  height: 600,
  markdown: SOURCE,
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

describe('markdown turn in the Turn schema', () => {
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
    // Отвечает на условия по типу и рядам так же, как Mongo.
    const meets = (condition) =>
      Object.entries(condition).every(([key, value]) => {
        if (key === '$or') return value.some(meets);
        if (key === 'rows.0') return value.$exists === (stored.rows?.length > 0);
        if (key === 'contentType') return '$ne' in value ? stored.contentType !== value.$ne : stored.contentType === value;
        return true;
      });
    mock.method(Turn.collection, 'findOneAndUpdate', async (filter, update, { projection }) => {
      updates.push({ filter, update, projection });
      if (!stored || !meets(filter)) return null;
      stored = { ...stored, ...update.$set };
      const result = { ...stored };
      for (const [key, included] of Object.entries(projection)) if (!included) delete result[key];
      return result;
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const create = (turn) =>
    call(createTurn, { gameInfo: { gameId }, body: turn });

  it('md is an available content type', () => {
    assert.equal(TEMPLATE_MD, 'md');
    assert.ok(AVAILABLE_TEMPLATES.includes('md'));
  });

  it('create from markdown splits it into rows of one column and stores no markdown', async () => {
    const { item } = await create(body());
    assert.equal(item.contentType, 'md');
    assert.deepEqual(
      item.rows.map((row) => row.left),
      ['  # Title', '   indented line\n==g quote== ^1664763801\n==y second==^1664763802', '- item']
    );
    assert.deepEqual(item.rows.map((row) => row.left), splitBlocks(SOURCE));
    assert.ok(item.rows.every((row) => row.right === '' && /^[0-9a-z]{14}$/.test(row.id)));
    assert.equal(new Set(item.rows.map((row) => row.id)).size, 3);
    assert.deepEqual(asJson(stored.rows), item.rows);
    assert.equal('markdown' in item, false);
    assert.equal('markdown' in stored, false);
  });

  it('a long source loses nothing on the way into rows', async () => {
    const long = '==g text==^1664763801\n'.repeat(20000);
    const { item } = await create(body({ markdown: long }));
    assert.equal(item.rows.map((row) => row.left).join('\n\n'), long.slice(0, -1));
  });

  it('create from rows keeps them, with an empty right column, and drops markdown', async () => {
    const rows = [
      { id: 'b1', left: '# Title' },
      { id: 'b2', left: 'Text ==🔴 quote==^1700000000001', right: '' },
    ];
    const { item } = await create(body({ rows, markdown: 'old copy of the text' }));
    assert.deepEqual(item.rows, [
      { id: 'b1', left: '# Title', right: '' },
      { id: 'b2', left: 'Text ==🔴 quote==^1700000000001', right: '' },
    ]);
    assert.equal('markdown' in stored, false);
  });

  it('create from rows with text in the right column is refused', async () => {
    await assert.rejects(
      create(body({ rows: [{ id: 'b1', left: 'a', right: 'b' }] })),
      (error) => error.statusCode === 400
    );
    assert.equal(stored, null);
  });

  it('an old copy with empty rows and markdown is split', async () => {
    const { item } = await create(body({ rows: [], markdown: 'One\n\nTwo' }));
    assert.deepEqual(item.rows.map((row) => row.left), ['One', 'Two']);
  });

  it('create without text has no rows and no markdown', async () => {
    const { item } = await create(body({ markdown: undefined }));
    assert.deepEqual(item.rows, []);
    assert.equal('markdown' in item, false);
    assert.equal('markdown' in stored, false);
  });

  it('other content types keep markdown as sent', async () => {
    const { item } = await create(body({ contentType: 'comment' }));
    assert.equal(item.markdown, SOURCE);
    assert.deepEqual(item.rows, []);
  });

  it('a content type outside the enum is rejected', async () => {
    await assert.rejects(
      create(body({ contentType: 'markdown' })),
      (error) => error.name === 'ValidationError' && !!error.errors.contentType
    );
    assert.equal(stored, null);
  });

  const put = (turn) =>
    call(updateTurn, { gameInfo: { gameId }, params: { id: turnId }, body: turn });

  it('update of an article not yet in rows stores the source as is and omits it from the response', async () => {
    stored = { ...body({ markdown: 'old' }), _id: turnId };
    const { item } = await put(body());
    assert.equal(updates[0].update.$set.markdown, SOURCE);
    assert.equal(stored.markdown, SOURCE);
    assert.equal('markdown' in item, false);
  });

  it('update with markdown and no type checks the stored type', async () => {
    stored = { ...body({ markdown: 'old' }), _id: turnId };
    const { markdown } = body();
    await put({ markdown });
    assert.deepEqual(updates[0].filter.$or, [
      { contentType: { $ne: 'md' } },
      { 'rows.0': { $exists: false } },
    ]);
    assert.equal(stored.markdown, SOURCE);
  });

  it('update that turns a translation with rows into an article with markdown is refused', async () => {
    const rows = [{ id: 'r1', left: 'left', right: 'right' }];
    stored = { ...body({ contentType: 'translation', markdown: undefined }), rows, _id: turnId };
    mock.method(Turn.collection, 'findOne', async () => ({ _id: turnId }));
    await assert.rejects(
      put(body()),
      (error) => error.statusCode === 400 && error.errorCode === 'article-in-rows'
    );
    assert.equal(stored.contentType, 'translation');
    assert.equal(stored.markdown, undefined);
  });

  it('update that turns an article in rows into another type with markdown goes through', async () => {
    const rows = [{ id: 'b1', left: 'Block', right: '' }];
    stored = { ...body({ markdown: undefined }), rows, _id: turnId };
    const { item } = await put(body({ contentType: 'comment' }));
    assert.equal(item.contentType, 'comment');
    assert.equal(stored.markdown, SOURCE);
  });

  it('create from rows gives a new id to a row without a usable id and to a repeated id', async () => {
    const rows = [
      { left: 'no id' },
      { id: '', left: 'empty id' },
      { id: 'b1', left: 'first b1' },
      { id: 'b1', left: 'second b1' },
      { id: 7, left: 'number id' },
      { id: 'b2', left: 'kept' },
    ];
    const { item } = await create(body({ rows }));
    assert.deepEqual(item.rows.map((row) => row.left), rows.map((row) => row.left));
    assert.equal(item.rows[2].id, 'b1');
    assert.equal(item.rows[5].id, 'b2');
    for (const index of [0, 1, 3, 4]) assert.match(item.rows[index].id, /^[0-9a-z]{14}$/);
    assert.equal(new Set(item.rows.map((row) => row.id)).size, rows.length);
  });

  it('update with markdown of an article in rows is refused and writes nothing', async () => {
    const rows = [{ id: 'b1', left: 'Block', right: '' }];
    stored = { ...body({ markdown: undefined }), rows, _id: turnId };
    mock.method(Turn.collection, 'findOne', async () => ({ _id: turnId }));
    await assert.rejects(
      put(body()),
      (error) =>
        error.statusCode === 400 && error.errorCode === 'article-in-rows' && /reload the page/i.test(error.message)
    );
    assert.equal(stored.markdown, undefined);
    assert.deepEqual(stored.rows, rows);
  });

  it('update without markdown of an article in rows goes through', async () => {
    const rows = [{ id: 'b1', left: 'Block', right: '' }];
    stored = { ...body({ markdown: undefined }), rows, _id: turnId };
    const { item } = await put({ header: 'New header' });
    assert.equal(updates[0].filter.$or, undefined);
    assert.equal(item.header, 'New header');
    assert.deepEqual(stored.rows, rows);
  });

  it('update with markdown of a missing turn answers 404', async () => {
    mock.method(Turn.collection, 'findOne', async () => null);
    await assert.rejects(put(body()), (error) => error.statusCode === 404);
  });

  it('the lobby feed reads neither the rows nor the text of an article', async () => {
    const lookup = (items) => ({
      sort: () => items,
      skip: () => lookup(items),
      limit: () => lookup(items),
      then: (resolve, reject) => Promise.resolve(items).then(resolve, reject),
    });
    mock.method(Game, 'find', () => lookup([{ _id: gameId }]));
    const find = mock.method(Turn, 'find', () => lookup([]));
    await call(getTurns, { query: { codes: 'aaaaaa:bbbbbbbb', mode: 'chrono' } });
    const projection = find.mock.calls[0].arguments[1];
    assert.equal(projection.rows, false);
    assert.equal(projection.markdown, false);
  });

  it('the canvas load leaves out the old text of an article in rows only', async () => {
    const rows = [{ id: 'b1', left: 'Block', right: '' }];
    const docs = [
      Turn.hydrate({ ...body(), _id: turnId, rows }),
      Turn.hydrate({ ...body(), _id: '66a3da300b474f60ae07d6d2' }),
    ];
    const lookup = { then: (resolve, reject) => Promise.resolve(docs).then(resolve, reject) };
    mock.method(Turn, 'find', () => lookup);
    const { items } = await call(getTurnsByIds, { gameInfo: { gameId }, query: {} });
    assert.equal('markdown' in items[0], false);
    assert.deepEqual(items[0].rows, rows);
    assert.equal(items[0].header, 'Header');
    assert.equal(items[1].markdown, SOURCE);
  });
});
