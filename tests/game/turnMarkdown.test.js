const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const { createTurn, updateTurn } = require('../../modules/game/controllers/Turn');
const { AVAILABLE_TEMPLATES, TEMPLATE_MD } = require('../../config/turn');

// Поле markdown и тип md в схеме Turn без базы: коллекция модели подменена,
// как в turnAudioTitle.test.js. Запуск: npm test.

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
    mock.method(Turn.collection, 'findOneAndUpdate', async (filter, update) => {
      updates.push({ filter, update });
      stored = { ...stored, ...update.$set };
      return stored;
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

  it('create stores the source as is: spaces, newlines and id tails', async () => {
    const { item } = await create(body());
    assert.equal(item.contentType, 'md');
    assert.equal(item.markdown, SOURCE);
    assert.equal(stored.markdown, SOURCE);
  });

  it('a long source is not cut', async () => {
    const long = '==g text==^1664763801\n'.repeat(20000);
    const { item } = await create(body({ markdown: long }));
    assert.equal(item.markdown.length, long.length);
  });

  it('create without the field leaves it unset', async () => {
    const { item } = await create(body({ markdown: undefined }));
    assert.equal('markdown' in item, false);
    assert.equal('markdown' in stored, false);
  });

  it('a content type outside the enum is rejected', async () => {
    await assert.rejects(
      create(body({ contentType: 'markdown' })),
      (error) => error.name === 'ValidationError' && !!error.errors.contentType
    );
    assert.equal(stored, null);
  });

  it('update sets the source as is', async () => {
    stored = { ...body({ markdown: 'old' }), _id: turnId };
    const { item } = await call(updateTurn, {
      gameInfo: { gameId },
      params: { id: turnId },
      body: body(),
    });
    assert.equal(updates[0].update.$set.markdown, SOURCE);
    assert.equal(item.markdown, SOURCE);
  });
});
