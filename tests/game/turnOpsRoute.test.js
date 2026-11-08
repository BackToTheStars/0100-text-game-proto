const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Turn = require('../../modules/game/models/Turn');
const Game = require('../../modules/game/models/Game');
const {
  applyTurnOperations,
} = require('../../modules/game/controllers/Turn');
const turnsRouter = require('../../modules/game/routes/turns');
const {
  ROLE_GAME_VISITOR,
  ROLE_GAME_PLAYER,
  ROLE_GAME_OWNER,
} = require('../../config/game/user');
const { TURN_OPS_MAX } = require('../../config/turn');

// POST /turns/:id/ops без базы: коллекция модели подменена и хранит один ход,
// как в turnTranslation.test.js. Запуск: npm test.

const gameId = '66a3da300b474f60ae07d6d0';
const otherGameId = '66a3da300b474f60ae07d6e0';
const turnId = '66a3da300b474f60ae07d6d1';

const ROWS = [
  { id: 'r1', left: '  # Title\n\nindented line\n', right: '  # Заголовок\n' },
  { id: 'r2', left: '==🔴quote==\n\n- item', right: '' },
];

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

describe('POST /turns/:id/ops', () => {
  let stored;
  let reads;
  let writes;
  let gameUpdated;

  const seed = (extra = {}) => {
    stored = {
      _id: new mongoose.Types.ObjectId(turnId),
      gameId: new mongoose.Types.ObjectId(gameId),
      contentType: 'translation',
      header: 'Header',
      paragraph: [{ insert: 'Title\n' }],
      rows: ROWS,
      languages: { left: 'en', right: 'ru' },
      opsVersion: 5,
      ...extra,
    };
  };

  const matches = (filter) =>
    !!stored &&
    String(filter._id) === String(stored._id) &&
    String(filter.gameId) === String(stored.gameId);

  const readStored = (filter, { projection }) => {
    if (!matches(filter)) {
      return null;
    }
    const picked = { _id: stored._id };
    for (const key of Object.keys(projection)) {
      if (stored[key] !== undefined) {
        picked[key] = asJson(stored[key]);
      }
    }
    return picked;
  };

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
    mock.method(Turn.collection, 'findOne', async (filter, options) => {
      reads += 1;
      return readStored(filter, options);
    });
    mock.method(Turn.collection, 'findOneAndUpdate', async (filter, update) => {
      writes.push({ filter, update });
      if (!matches(filter) || filter.opsVersion !== (stored.opsVersion ?? null)) {
        return null;
      }
      stored = {
        ...stored,
        ...update.$set,
        opsVersion: (stored.opsVersion || 0) + update.$inc.opsVersion,
      };
      return { _id: stored._id, opsVersion: stored.opsVersion };
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const post = (ops, game = gameId) =>
    call(applyTurnOperations, {
      gameInfo: { gameId: game },
      params: { id: turnId },
      body: { ops },
    });

  const setKeys = (index = 0) =>
    Object.keys(writes[index].update.$set)
      .filter((key) => key !== 'updatedAt')
      .sort();

  const refused = (promise, statusCode, pattern = /./) =>
    assert.rejects(
      promise,
      (error) => error.statusCode === statusCode && pattern.test(error.message)
    );

  it('applies the operations to the stored turn and answers with the version only', async () => {
    const result = await post([
      { op: 'row.set', id: 'r2', right: 'перевод' },
      { op: 'row.insert', after: 'r1', row: { id: 'r3', left: 'new' } },
    ]);
    assert.deepEqual(result, { success: true, version: 6 });
    assert.equal(reads, 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].filter.opsVersion, 5);
    assert.deepEqual(writes[0].update.$inc, { opsVersion: 1 });
    assert.deepEqual(asJson(stored.rows), [
      ROWS[0],
      { id: 'r3', left: 'new', right: '' },
      { id: 'r2', left: ROWS[1].left, right: 'перевод' },
    ]);
    assert.equal(gameUpdated, 1);
  });

  it('one request is one version, however many operations it carries', async () => {
    const ops = [];
    for (let index = 0; index < TURN_OPS_MAX; index += 1) {
      ops.push({ op: 'row.set', id: `n${index}`, left: String(index) });
    }
    assert.deepEqual(await post(ops), { success: true, version: 6 });
    assert.deepEqual(await post([{ op: 'row.remove', id: 'n0' }]), {
      success: true,
      version: 7,
    });
    assert.equal(stored.rows.length, ROWS.length + TURN_OPS_MAX - 1);
  });

  it('writes only what the request changed, scoped to the game', async () => {
    await post([{ op: 'fields.set', fields: { header: 'New' } }]);
    await post([{ op: 'row.remove', id: 'r1' }]);
    await post([
      { op: 'row.set', id: 'r2', right: 'x' },
      { op: 'fields.set', fields: { paragraph: [{ insert: 'quote\n' }] } },
    ]);
    assert.deepEqual(setKeys(0), ['header']);
    assert.deepEqual(setKeys(1), ['rows']);
    assert.deepEqual(setKeys(2), ['paragraph', 'rows']);
    for (const { filter, update } of writes) {
      // $setOnInsert.createdAt добавляют timestamps mongoose; без upsert он не пишет.
      assert.deepEqual(Object.keys(update).sort(), ['$inc', '$set', '$setOnInsert']);
      assert.deepEqual(update.$inc, { opsVersion: 1 });
      assert.equal(String(filter._id), turnId);
      assert.equal(String(filter.gameId), gameId);
    }
    assert.equal(stored.header, 'New');
    assert.deepEqual(asJson(stored.languages), { left: 'en', right: 'ru' });
    assert.deepEqual(asJson(stored.rows), [
      { id: 'r2', left: ROWS[1].left, right: 'x' },
    ]);
  });

  it('several fields.set of one request are written merged', async () => {
    await post([
      { op: 'fields.set', fields: { header: 'a', sourceUrl: 'https://example.org' } },
      { op: 'fields.set', fields: { header: 'b', dontShowHeader: true } },
    ]);
    assert.deepEqual(setKeys(), ['dontShowHeader', 'header', 'sourceUrl']);
    assert.equal(stored.header, 'b');
    assert.equal(stored.dontShowHeader, true);
    assert.equal(stored.sourceUrl, 'https://example.org');
  });

  it('casts the date to a Date and keeps null', async () => {
    await post([{ op: 'fields.set', fields: { date: '2026-11-06' } }]);
    assert.ok(stored.date instanceof Date);
    assert.equal(stored.date.toISOString(), '2026-11-06T00:00:00.000Z');
    await post([{ op: 'fields.set', fields: { date: null, sourceUrl: null } }]);
    assert.equal(stored.date, null);
    assert.equal(stored.sourceUrl, null);
  });

  it('a date that is not a date is refused before the write', async () => {
    await assert.rejects(
      post([
        { op: 'row.set', id: 'r1', left: 'x' },
        { op: 'fields.set', fields: { date: 'not a date' } },
      ]),
      (error) => error.name === 'CastError' && error.path === 'date'
    );
    assert.equal(writes.length, 0);
    assert.equal(gameUpdated, 0);
  });

  it('an error in the middle of the list writes nothing', async () => {
    await refused(
      post([
        { op: 'row.set', id: 'r1', left: 'x' },
        { op: 'row.move', id: 'r1', after: null },
        { op: 'row.remove', id: 'r2' },
      ]),
      400,
      /Unknown operation "row.move"/
    );
    await refused(
      post([
        { op: 'fields.set', fields: { header: 'x' } },
        { op: 'fields.set', fields: { contentType: 'comment' } },
      ]),
      400,
      /not allowed/
    );
    assert.equal(writes.length, 0);
    assert.equal(gameUpdated, 0);
    assert.deepEqual(stored.rows, ROWS);
    assert.equal(stored.opsVersion, 5);
  });

  it('refuses a list longer than the limit and a body without a list', async () => {
    const op = { op: 'row.set', id: 'r1', left: 'x' };
    await refused(post(Array(TURN_OPS_MAX + 1).fill(op)), 400, /at most/);
    await refused(post([]), 400, /non-empty array/);
    await refused(post(undefined), 400, /non-empty array/);
    await refused(post(op), 400, /non-empty array/);
    await refused(
      call(applyTurnOperations, {
        gameInfo: { gameId },
        params: { id: turnId },
        body: [op],
      }),
      400,
      /non-empty array/
    );
    assert.equal(writes.length, 0);
  });

  it('answers 404 for a missing turn and for a turn of another game', async () => {
    const ops = [{ op: 'row.remove', id: 'r1' }];
    await refused(post(ops, otherGameId), 404);
    stored = null;
    await refused(post(ops), 404);
    assert.equal(writes.length, 0);
    assert.equal(gameUpdated, 0);
  });

  it('two parallel requests for different rows both land', async () => {
    const results = await Promise.all([
      post([{ op: 'row.set', id: 'r1', right: 'first' }]),
      post([{ op: 'row.set', id: 'r2', right: 'second' }]),
    ]);
    assert.deepEqual(
      results.map(({ version }) => version).sort(),
      [6, 7]
    );
    // Оба прочли версию 5: второй промахнулся и повторил на свежих рядах.
    assert.deepEqual(
      writes.map(({ filter }) => filter.opsVersion),
      [5, 5, 6]
    );
    assert.deepEqual(asJson(stored.rows), [
      { id: 'r1', left: ROWS[0].left, right: 'first' },
      { id: 'r2', left: ROWS[1].left, right: 'second' },
    ]);
    assert.equal(stored.opsVersion, 7);
    assert.equal(gameUpdated, 2);
  });

  it('gives up with 409 after three misses', async () => {
    mock.method(Turn.collection, 'findOneAndUpdate', async () => null);
    await assert.rejects(
      post([{ op: 'row.set', id: 'r1', left: 'mine' }]),
      (error) =>
        error.statusCode === 409 &&
        error.errorCode === 'turn-changed' &&
        /changed by someone else/.test(error.message)
    );
    assert.equal(reads, 3);
    assert.equal(gameUpdated, 0);
  });

  it('a turn saved with the former rows counter only takes operations', async () => {
    seed({ opsVersion: undefined, rowsVersion: 4 });
    const result = await post([{ op: 'row.set', id: 'r1', right: 'x' }]);
    assert.deepEqual(result, { success: true, version: 1 });
    assert.equal(writes[0].filter.opsVersion, null);
    assert.equal('rowsVersion' in writes[0].filter, false);
    assert.deepEqual(setKeys(), ['rows']);
    assert.deepEqual(await post([{ op: 'row.remove', id: 'r2' }]), {
      success: true,
      version: 2,
    });
    assert.equal(writes[1].filter.opsVersion, 1);
    assert.equal(stored.rowsVersion, 4);
  });

  it('row operations do not look at the content type', async () => {
    seed({ contentType: 'comment', rows: undefined });
    await post([{ op: 'row.insert', after: null, row: { id: 'r1', left: 'x' } }]);
    assert.deepEqual(asJson(stored.rows), [{ id: 'r1', left: 'x', right: '' }]);
    assert.equal(stored.contentType, 'comment');
  });
});

describe('turn routes', () => {
  const routeOf = (method, path) =>
    turnsRouter.stack
      .map((layer) => layer.route)
      .find((route) => route.path === path && route.methods[method]);

  const guard = async (route, role) => {
    let outcome = 'pending';
    await route.stack[0].handle({ gameInfo: { role } }, {}, (err) => {
      outcome = err ? err.statusCode : 'passed';
    });
    return outcome;
  };

  it('operations go through the turn editing rule', async () => {
    const route = routeOf('post', '/:id/ops');
    assert.ok(route);
    assert.equal(route.stack.length, 2);
    assert.equal(route.stack[1].handle, applyTurnOperations);
    assert.equal(await guard(route, ROLE_GAME_VISITOR), 403);
    assert.equal(await guard(route, ROLE_GAME_PLAYER), 'passed');
    assert.equal(await guard(route, ROLE_GAME_OWNER), 'passed');
  });

  it('the former rows route is gone', () => {
    assert.equal(routeOf('put', '/:id/rows'), undefined);
    assert.ok(routeOf('put', '/:id'));
  });
});
