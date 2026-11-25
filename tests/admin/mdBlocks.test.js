const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { scripts } = require('../../modules/admin/services/scripts');
const { classify, createMdBlocksCommands } = require('../../modules/admin/services/scripts/MdBlocks');
const { splitBlocks, joinBlocks } = require('../../modules/game/services/mdBlocks');

// Миграция статьи md в ряды без базы: модель подменена объектом, который отвечает на фильтры
// скрипта так же, как Mongo. Запуск: npm test (node --test).

const id = (tail) => `66a3da300b474f60ae07d${tail}`;
const gameId = id('000');
const PASS = new Date('2026-11-23T10:00:00.000Z');
const UPDATED = new Date('2026-11-20T10:00:00.000Z');

const sameValue = (a, b) =>
  a instanceof Date || b instanceof Date ? a?.getTime?.() === b?.getTime?.() : a === b;

const matches = (doc, filter) =>
  Object.entries(filter).every(([key, value]) => {
    if (key === '_id') return '' + doc._id === '' + value;
    if (key === 'rows.0') return value.$exists === (Array.isArray(doc.rows) && doc.rows.length > 0);
    if (value && typeof value === 'object' && '$exists' in value) return value.$exists === (doc[key] != null);
    return sameValue(doc[key] ?? null, value);
  });

const fakeModel = (docs, { failOn = () => false } = {}) => {
  const calls = [];
  return {
    docs,
    calls,
    find: (criteria) => ({
      lean: async () => docs.filter((doc) => matches(doc, criteria)).map((doc) => structuredClone(doc)),
    }),
    updateOne: async (filter, update, options) => {
      calls.push({ filter, update, options });
      if (failOn('' + filter._id)) throw new Error('write failed');
      const doc = docs.find((item) => matches(item, filter));
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      Object.assign(doc, structuredClone(update.$set || {}));
      for (const key of Object.keys(update.$unset || {})) delete doc[key];
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
};

const commandsOn = (docs, options) => {
  const model = fakeModel(docs, options);
  return { model, ...createMdBlocksCommands({ Turn: model, now: () => PASS }) };
};

// Статья с цитатами, лишними пустыми строками и CRLF: круг «разделить → откатить» обязан вернуть её побайтно.
const QUOTED =
  '# Book\r\n\r\n\r\nFirst ==🔴 quoted\r\ntext==^1700000000001 here.\r\n\r\n- a\r\n- b ==🟢 two==^1700000000002\r\n\r\n\r\n';
const bigTable = () =>
  ['| a | b |', '| - | - |', ...Array.from({ length: 900 }, (_, n) => `| row ${n} | value ${n} |`)].join('\n');

const article = (tail, extra) => ({
  _id: id(tail),
  gameId,
  contentType: 'md',
  header: 'Article ' + tail,
  paragraph: [{ insert: 'preview\n' }],
  updatedAt: UPDATED,
  opsVersion: 0,
  ...extra,
});

const stand = () => [
  article('001', { markdown: QUOTED }),
  article('002', { markdown: `Intro.\n\n${bigTable()}\n\nOutro.` }),
  article('003', { markdown: 'kept', rows: [{ id: 'b1', left: 'kept', right: '' }], mdBlocksPass: PASS }),
  article('004', { rows: [{ id: 'b1', left: 'made in rows', right: '' }] }),
  article('005', { markdown: '\n\n' }),
  article('006', {}),
  { _id: id('007'), gameId, contentType: 'translation', rows: [{ id: 'r1', left: 'a', right: 'b' }] },
];

const byId = (model, tail) => model.docs.find((doc) => doc._id === id(tail));

describe('article migration into rows: plan', () => {
  it('classifies articles by rows, mark and text', () => {
    const docs = stand();
    assert.deepEqual(docs.slice(0, 6).map(classify), ['toSplit', 'toSplit', 'migrated', 'inRows', 'toSplit', 'noText']);
  });

  it('the report counts articles, blocks, large blocks and the largest document and writes nothing', async () => {
    const { model, check } = commandsOn(stand());
    const [ok, lines] = await check();
    assert.equal(ok, true);
    assert.equal(model.calls.length, 0);
    const text = lines.join('\n');
    assert.match(text, /Статей md: 6/);
    assert.match(text, /к делению: 2 \(.* KB\), пустой текст: 1/);
    assert.match(text, /в рядах с меткой прохода: 1/);
    assert.match(text, /в рядах без метки .*: 1/);
    assert.match(text, /без рядов и без текста: 1/);
    const blocks = splitBlocks(QUOTED).length + splitBlocks(byId(model, '002').markdown).length;
    assert.match(text, new RegExp(`Блоков получится: ${blocks}; больших блоков \\(> 16\\.0 KB\\) поделится: 1`));
    assert.match(text, new RegExp(`Самый большой документ после: ${id('002')} — `));
    assert.match(text, new RegExp(`${id('001')} \\(игра ${gameId}\\): .* → 3 блоков`));
  });
});

describe('article migration into rows: run and revert', () => {
  it('run writes rows with the pass mark, keeps markdown and updatedAt, and touches nothing else', async () => {
    const { model, run } = commandsOn(stand());
    const [ok, lines] = await run();
    assert.equal(ok, true, lines.join('\n'));
    assert.match(lines[0], /метка прохода 2026-11-23T10:00:00\.000Z/);
    assert.match(lines.join('\n'), /Записано: 2 из 2/);
    assert.match(lines.join('\n'), /После запуска: к делению 0, в рядах с меткой 3/);
    assert.equal(model.calls.length, 2);
    assert.ok(model.calls.every((call) => call.options.timestamps === false));
    const first = byId(model, '001');
    assert.deepEqual(first.rows.map((row) => row.left), [
      '# Book',
      'First ==🔴 quoted\ntext==^1700000000001 here.',
      '- a\n- b ==🟢 two==^1700000000002',
    ]);
    assert.ok(first.rows.every((row) => row.right === '' && row.id));
    assert.equal(first.markdown, QUOTED);
    assert.deepEqual(first.mdBlocksPass, PASS);
    assert.equal(first.updatedAt, UPDATED);
    assert.equal(byId(model, '002').rows.length, splitBlocks(byId(model, '002').markdown).length);
    assert.equal(byId(model, '004').mdBlocksPass, undefined);
    assert.equal(byId(model, '005').rows, undefined);
  });

  it('a second run changes nothing', async () => {
    const { model, run } = commandsOn(stand());
    await run();
    const before = structuredClone(model.docs);
    const [ok, lines] = await run();
    assert.equal(ok, true);
    assert.match(lines.join('\n'), /Записано: 0 из 0/);
    assert.deepEqual(model.docs, before);
  });

  it('revert after run gives the source back byte for byte and drops the rows and the mark', async () => {
    const { model, run, revert } = commandsOn(stand());
    await run();
    const [ok, lines] = await revert();
    assert.equal(ok, true, lines.join('\n'));
    assert.match(lines.join('\n'), /Статей с меткой прохода: 3/);
    assert.match(lines.join('\n'), /исходник возвращён как был: 3/);
    const first = byId(model, '001');
    assert.equal(first.markdown, QUOTED);
    assert.equal('rows' in first, false);
    assert.equal('mdBlocksPass' in first, false);
    assert.ok(model.calls.every((call) => call.options.timestamps === false));
  });

  it('revert joins an article made in rows into markdown, and the next run splits it again', async () => {
    const docs = stand();
    const made = byId({ docs }, '004');
    made.rows = [
      { id: 'b1', left: '# Made in rows', right: '' },
      { id: 'b2', left: 'Text ==🔴 quote==^1700000000003.', right: '' },
    ];
    const blocks = made.rows.map((row) => row.left);
    const { model, run, revert } = commandsOn(docs);
    const [ok, lines] = await revert();
    assert.equal(ok, true, lines.join('\n'));
    assert.ok(lines.includes('созданы рядами — склеены: 1 из 1'));
    assert.equal(made.markdown, joinBlocks(blocks));
    assert.equal('rows' in made, false);
    assert.equal('mdBlocksPass' in made, false);
    const [, check] = await commandsOn(model.docs).check();
    assert.match(check.join('\n'), /созданы рядами, откат склеит: 0/);
    await run();
    assert.deepEqual(made.rows.map((row) => row.left), blocks);
    assert.deepEqual(made.mdBlocksPass, PASS);
  });

  it('an article made in rows and edited after it was read is not joined', async () => {
    const { model, revert } = commandsOn(stand());
    const find = model.find;
    model.find = (criteria) => ({
      lean: async () => {
        const read = await find(criteria).lean();
        byId(model, '004').opsVersion = 7;
        return read;
      },
    });
    const [ok, lines] = await revert();
    assert.equal(ok, false);
    assert.ok(lines.some((line) => line.startsWith(`not reverted ${id('004')}`)));
    assert.equal(byId(model, '004').rows.length, 1);
  });

  it('a marked article edited after it was read is not reverted', async () => {
    const { model, run, revert } = commandsOn(stand());
    await run();
    const find = model.find;
    model.find = (criteria) => ({
      lean: async () => {
        const read = await find(criteria).lean();
        const first = byId(model, '001');
        first.rows[0].left = '# Edited during revert';
        first.opsVersion = 1;
        return read;
      },
    });
    const [ok, lines] = await revert();
    assert.equal(ok, false);
    assert.ok(lines.some((line) => line.startsWith(`not reverted ${id('001')}`)));
    const first = byId(model, '001');
    assert.equal(first.rows[0].left, '# Edited during revert');
    assert.deepEqual(first.mdBlocksPass, PASS);
    assert.equal(first.markdown, QUOTED);
  });

  it('revert of an edited article joins its rows', async () => {
    const { model, run, revert } = commandsOn(stand());
    await run();
    const first = byId(model, '001');
    first.rows[1].left = 'Edited ==🔴 quoted==^1700000000001.';
    first.rows.push({ id: 'new', left: 'Added block', right: '' });
    const [, lines] = await revert();
    assert.match(lines.join('\n'), /текст склеен из рядов: 1/);
    assert.equal(
      first.markdown,
      '# Book\n\nEdited ==🔴 quoted==^1700000000001.\n\n- a\n- b ==🟢 two==^1700000000002\n\nAdded block'
    );
  });

  it('a failure on one article is reported and does not stop the pass', async () => {
    const { model, run } = commandsOn(stand(), { failOn: (turnId) => turnId === id('001') });
    const [ok, lines] = await run();
    assert.equal(ok, false);
    assert.ok(lines.includes(`failed ${id('001')}: write failed`));
    assert.match(lines.join('\n'), /Записано: 1 из 2/);
    assert.ok(byId(model, '002').rows.length > 0);
    assert.equal(byId(model, '001').rows, undefined);
  });

  it('an article changed after it was read is not written', async () => {
    const docs = stand();
    const { model, run } = commandsOn(docs);
    const find = model.find;
    model.find = (criteria) => ({
      lean: async () => {
        const read = await find(criteria).lean();
        byId(model, '002').updatedAt = new Date();
        return read;
      },
    });
    const [ok, lines] = await run();
    assert.equal(ok, false);
    assert.ok(lines.some((line) => line.startsWith(`not written ${id('002')}`)));
  });
});

describe('article migration into rows: rows without the mark over a source', () => {
  // Первая запись большой статьи оборвалась: в рядах начало, в markdown — весь текст.
  const FULL = 'One.\n\nTwo.\n\nThree.\n\nFour.';
  const docs = () => [
    article('011', { markdown: FULL, rows: [{ id: 'b1', left: 'One.', right: '' }, { id: 'b2', left: 'Two.', right: '' }] }),
    article('012', { markdown: 'Same.\r\n\r\n\r\nText.\n', rows: [{ id: 'b1', left: 'Same.', right: '' }, { id: 'b2', left: 'Text.', right: '' }] }),
    article('013', { markdown: '\n\n', rows: [{ id: 'b1', left: 'Only rows', right: '' }] }),
  ];

  it('check lists such articles with the number of rows and of blocks in markdown', async () => {
    const { model, check } = commandsOn(docs());
    assert.deepEqual(model.docs.map(classify), ['inRowsOverSource', 'inRows', 'inRows']);
    const [ok, lines] = await check();
    assert.equal(ok, true);
    assert.ok(lines.includes('  в рядах без метки, markdown не совпадает с рядами — откат не тронет: 1'), lines.join('\n'));
    assert.ok(lines.includes(`  ${id('011')} (игра ${gameId}): рядов 2, блоков в markdown 4`), lines.join('\n'));
    assert.match(lines.join('\n'), /в рядах без метки — созданы рядами, откат склеит: 2/);
  });

  it('revert keeps the source and the rows of such an article and reports it', async () => {
    const { model, revert } = commandsOn(docs());
    const [ok, lines] = await revert();
    assert.equal(ok, false);
    assert.ok(
      lines.includes(`kept ${id('011')}: rows 2, blocks in markdown 4 — markdown differs from the rows, nothing written`),
      lines.join('\n')
    );
    assert.ok(lines.includes('созданы рядами — склеены: 2 из 2'), lines.join('\n'));
    assert.ok(lines.includes('в рядах без метки поверх другого markdown — не тронуты: 1'), lines.join('\n'));
    const kept = byId(model, '011');
    assert.equal(kept.markdown, FULL);
    assert.equal(kept.rows.length, 2);
    assert.equal(byId(model, '012').markdown, 'Same.\n\nText.');
    assert.equal('rows' in byId(model, '012'), false);
    assert.equal(byId(model, '013').markdown, 'Only rows');
    assert.ok(model.calls.every((call) => '' + call.filter._id !== id('011')));
  });
});

describe('article migration into rows: registry', () => {
  it('is an admin script with report, run and revert', () => {
    const script = scripts.find((item) => item.name === 'SCRIPT_MD_BLOCKS');
    assert.deepEqual(
      script.commands.map((command) => [command.name, !!command.confirm]),
      [['check', false], ['run', true], ['revert', true]]
    );
  });
});
