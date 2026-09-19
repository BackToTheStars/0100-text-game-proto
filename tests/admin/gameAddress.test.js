const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Game = require('../../modules/game/models/Game');
const {
  legacyAddressFromId,
  classifyAddress,
  planAddresses,
  createAddressCommands,
} = require('../../modules/admin/services/scripts/GameAddress');

// План миграции адреса без базы: кому проставить вычисленный адрес, кого
// пропустить и почему, кого отдать на разбор; команды check / run — на модели,
// подменённой объектом, который отвечает на { hash: { $exists: false } } так же,
// как Mongo. Запуск: npm test (node --test).

const id = (tail) => `66a3da300b474f60ae07d${tail}`;

// Подмена Game: find().select().lean() отдаёт копии документов, updateOne
// пишет только в документ без поля hash и запоминает вызовы.
const fakeModel = (docs, { failOn = () => false } = {}) => {
  const calls = [];
  return {
    docs,
    calls,
    find: () => ({
      select: () => ({ lean: async () => docs.map((doc) => ({ ...doc })) }),
    }),
    updateOne: async (filter, update, options) => {
      calls.push({ filter, update, options });
      if (failOn(filter._id)) {
        throw new Error('write failed');
      }
      const doc = docs.find((item) => '' + item._id === '' + filter._id);
      const matched = !!doc && !Object.hasOwn(doc, 'hash');
      if (matched) {
        doc.hash = update.$set.hash;
      }
      return { matchedCount: matched ? 1 : 0, modifiedCount: matched ? 1 : 0 };
    },
  };
};

const commandsOn = (docs, options) => {
  const model = fakeModel(docs, options);
  let cleared = 0;
  const { check, run } = createAddressCommands({
    Game: model,
    clearGamesCache: () => {
      cleared += 1;
    },
  });
  return { model, check, run, cleared: () => cleared };
};

describe('legacyAddressFromId', () => {
  it('is the last three characters of the id', () => {
    assert.equal(legacyAddressFromId(id('6d1')), '6d1');
    assert.equal(legacyAddressFromId({ toString: () => 'abc123' }), '123');
  });
});

describe('classifyAddress', () => {
  it('absent field, usable string, everything else needs review', () => {
    assert.equal(classifyAddress({ _id: id('aaa') }), 'absent');
    assert.equal(classifyAddress({ _id: id('aaa'), hash: 'aaa' }), 'usable');
    assert.equal(classifyAddress({ _id: id('aaa'), hash: null }), 'review');
    assert.equal(classifyAddress({ _id: id('aaa'), hash: '' }), 'review');
    assert.equal(classifyAddress({ _id: id('aaa'), hash: 7 }), 'review');
    assert.equal(classifyAddress({ _id: id('aaa'), hash: undefined }), 'review');
  });
});

describe('planAddresses', () => {
  it('leaves games that already have an address alone', () => {
    const plan = planAddresses([
      { _id: id('aaa'), hash: 'a1b2c3', codes: [{ hash: 'a1b2c3' }] },
      { _id: id('bbb'), hash: 'bbb', codes: [{ hash: 'bbb' }] },
    ]);
    assert.deepEqual(plan, { missing: 0, assign: [], skipped: [], review: [] });
  });

  it('assigns the computed address; its own visitor code equal to it is not a clash', () => {
    const plan = planAddresses([
      { _id: id('6d1'), codes: [{ hash: '6d1' }, { hash: '6d1abc' }] },
    ]);
    assert.equal(plan.missing, 1);
    assert.deepEqual(plan.assign, [{ _id: id('6d1'), hash: '6d1' }]);
    assert.deepEqual(plan.skipped, []);
    assert.deepEqual(plan.review, []);
  });

  it('skips both games whose ids share the tail and names the other one', () => {
    const plan = planAddresses([
      { _id: id('6d1'), codes: [{ hash: '6d1' }] },
      { _id: '5f0000000000000000000' + '6d1', codes: [] },
      { _id: id('506'), codes: [] },
    ]);
    assert.deepEqual(plan.assign, [{ _id: id('506'), hash: '506' }]);
    assert.equal(plan.skipped.length, 2);
    assert.deepEqual(plan.skipped[0], {
      _id: id('6d1'),
      hash: '6d1',
      takenBy: ['5f00000000000000000006d1'],
    });
    assert.deepEqual(plan.skipped[1].takenBy, [id('6d1')]);
  });

  it('skips a game whose computed address is the address or a code of another game', () => {
    const plan = planAddresses([
      { _id: id('abc'), codes: [] },
      { _id: id('111'), hash: 'abc', codes: [] },
      { _id: id('def'), codes: [] },
      { _id: id('222'), hash: '222', codes: [{ hash: 'def' }] },
    ]);
    assert.deepEqual(plan.assign, []);
    assert.deepEqual(
      plan.skipped.map(({ hash, takenBy }) => [hash, takenBy]),
      [
        ['abc', [id('111')]],
        ['def', [id('222')]],
      ]
    );
  });

  it('null, empty and non-string hash go to review, not to assign', () => {
    const plan = planAddresses([
      { _id: id('aaa'), hash: null, codes: [] },
      { _id: id('bbb'), hash: '', codes: [] },
      { _id: id('ccc'), hash: 7, codes: [] },
      { _id: id('ddd'), codes: [] },
    ]);
    assert.equal(plan.missing, 1);
    assert.deepEqual(plan.assign, [{ _id: id('ddd'), hash: 'ddd' }]);
    assert.deepEqual(plan.skipped, []);
    assert.deepEqual(plan.review, [
      { _id: id('aaa'), value: 'null' },
      { _id: id('bbb'), value: 'empty string' },
      { _id: id('ccc'), value: 'number 7' },
    ]);
  });

  it('a game under review still claims its own id tail', () => {
    const plan = planAddresses([
      { _id: id('6d1'), hash: null, codes: [] },
      { _id: '5f0000000000000000000' + '6d1', codes: [] },
    ]);
    assert.deepEqual(plan.assign, []);
    assert.deepEqual(plan.skipped, [
      { _id: '5f00000000000000000006d1', hash: '6d1', takenBy: [id('6d1')] },
    ]);
    assert.equal(plan.review.length, 1);
  });

  it('is a no-op once the plan has been applied', () => {
    const games = [
      { _id: id('6d1'), codes: [{ hash: '6d1' }] },
      { _id: id('506'), codes: [] },
    ];
    const first = planAddresses(games);
    for (const { _id, hash } of first.assign) {
      games.find((game) => game._id === _id).hash = hash;
    }
    assert.deepEqual(planAddresses(games), {
      missing: 0,
      assign: [],
      skipped: [],
      review: [],
    });
  });
});

describe('check', () => {
  it('reports absent, usable and review values apart, and counts a number as no address', async () => {
    const { check } = commandsOn([
      { _id: id('aaa'), hash: null, codes: [] },
      { _id: id('bbb'), hash: '', codes: [] },
      { _id: id('ccc'), hash: 7, codes: [] },
      { _id: id('ddd'), codes: [] },
      { _id: id('eee'), hash: 'eee', codes: [{ hash: 'eee' }] },
    ]);
    const [success, lines] = await check();
    assert.equal(success, true);
    assert.deepEqual(lines, [
      '5 games, 1 with an address',
      '1 games without the field: 1 to assign, 0 to skip',
      '3 games with an unusable value (need review)',
      `review ${id('aaa')}: hash is null`,
      `review ${id('bbb')}: hash is empty string`,
      `review ${id('ccc')}: hash is number 7`,
    ]);
  });
});

describe('run', () => {
  it('writes only games without the field, with timestamps off, and reports review games', async () => {
    const { model, run, cleared } = commandsOn([
      { _id: id('aaa'), hash: null, codes: [] },
      { _id: id('bbb'), hash: '', codes: [] },
      { _id: id('ddd'), codes: [] },
    ]);
    const [success, lines] = await run();
    assert.equal(success, true);
    assert.equal(cleared(), 1);
    assert.deepEqual(
      model.calls.map(({ filter, update, options }) => [filter, update, options]),
      [
        [
          { _id: id('ddd'), hash: { $exists: false } },
          { $set: { hash: 'ddd' } },
          { timestamps: false },
        ],
      ]
    );
    assert.equal(model.docs.find((doc) => doc._id === id('ddd')).hash, 'ddd');
    assert.equal(model.docs.find((doc) => doc._id === id('aaa')).hash, null);
    assert.deepEqual(lines, [
      '1 of 1 planned games got an address',
      '0 games skipped',
      '2 games need review',
      'after the run: 0 games without the field, 2 need review',
      `review ${id('aaa')}: hash is null`,
      `review ${id('bbb')}: hash is empty string`,
    ]);
  });

  it('an address that appeared between the plan and the write is reported and fails the run', async () => {
    const docs = [
      { _id: id('aaa'), codes: [] },
      { _id: id('bbb'), codes: [] },
    ];
    const { model, run } = commandsOn(docs);
    // Пока шла запись первой игры, вторая получила адрес от кого-то ещё.
    const original = model.updateOne;
    model.updateOne = async (...args) => {
      docs[1].hash = 'x1';
      model.updateOne = original;
      return original(...args);
    };
    const [success, lines] = await run();
    assert.equal(success, false);
    assert.equal(model.calls.length, 2);
    assert.equal(docs[0].hash, 'aaa');
    assert.equal(docs[1].hash, 'x1');
    assert.equal(lines[0], '1 of 2 planned games got an address');
    assert.ok(
      lines.includes(
        `not written ${id('bbb')}: the field appeared or the game is gone since the plan`
      ),
      lines.join('\n')
    );
  });

  it('a write error is reported and fails the run, other games are still written', async () => {
    const { model, run } = commandsOn(
      [
        { _id: id('aaa'), codes: [] },
        { _id: id('bbb'), codes: [] },
      ],
      { failOn: (_id) => _id === id('aaa') }
    );
    const [success, lines] = await run();
    assert.equal(success, false);
    assert.equal(model.docs[1].hash, 'bbb');
    assert.equal(lines[0], '1 of 2 planned games got an address');
    assert.ok(lines.includes(`failed ${id('aaa')}: write failed`), lines.join('\n'));
    assert.equal(lines[3], 'after the run: 1 games without the field, 0 need review');
  });

  it('a second run assigns nothing and succeeds', async () => {
    const { model, run } = commandsOn([
      { _id: id('aaa'), codes: [] },
      { _id: id('bbb'), hash: 'bbb', codes: [] },
    ]);
    assert.equal((await run())[0], true);
    const [success, lines] = await run();
    assert.equal(success, true);
    assert.equal(model.calls.length, 1);
    assert.equal(lines[0], '0 of 0 planned games got an address');
    assert.equal(lines[3], 'after the run: 0 games without the field, 0 need review');
  });
});

// Тот же запрос на настоящей модели Game: pre-hooks mongoose добавляют
// $set.updatedAt в любой updateOne, и без { timestamps: false } миграция
// меняла дату обновления всех игр (лобби сортирует по ней). Хуки запускаются
// без базы — тем же путём, что и exec().
const runPreHooks = (query) =>
  new Promise((resolve, reject) =>
    query._queryMiddleware.execPre(query.op, query, [], (err) =>
      err ? reject(err) : resolve()
    )
  );

describe('updatedAt of a migrated game', () => {
  it('stays untouched with the options run() passes, and would change without them', async () => {
    const { model, run } = commandsOn([{ _id: id('6d1'), codes: [] }]);
    await run();
    const [{ filter, update, options }] = model.calls;

    const asRun = Game.updateOne(filter, update, options);
    await runPreHooks(asRun);
    assert.deepEqual(asRun.getUpdate(), { $set: { hash: '6d1' } });

    const plain = Game.updateOne(filter, update);
    await runPreHooks(plain);
    assert.ok(plain.getUpdate().$set.updatedAt instanceof Date);
  });
});
