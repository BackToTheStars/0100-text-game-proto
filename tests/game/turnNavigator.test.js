const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listTurns, summary, pageCriteria, TEXT_BUDGET, SEARCH_QUEUE_LIMIT, PARSE_SLICE } = require('../../modules/game/services/turnNavigator');

test('formatted Quill inserts make one searchable untitled turn', () => {
  const row = summary({ paragraph: [{ insert: 'First line\nThe ' }, { insert: 'harbour' }] }, 'the harbour');
  assert.equal(row.title, 'First line');
  assert.match(row.snippet, /The harbour/);
  assert.equal(summary({ header: 'Example' }, '.*'), null);
  assert.equal(summary({ contentType: 'picture-only' }, '').title, '');
});

test('translation matches the real cell even if the preview contains the hit', () => {
  const turn = { contentType: 'translation', paragraph: [{ insert: 'stale preview signal' }],
    rows: [{ left: 'Letter', right: 'Wait for the **signal**' }] };
  assert.equal(summary(turn, 'the signal').column, 'right');
  assert.equal(summary(turn, 'stale'), null);
  turn.rows.push({ left: '', right: 'x'.repeat(5000) + ' Last **row**' });
  assert.match(summary(turn, 'last row').snippet, /Last row/);
});

test('page cursor keeps game scope and handles legacy undated turns', () => {
  const id = '000000000000000000000004';
  assert.deepEqual(pageCriteria('game', 'null_' + id).$or, [{ createdAt: null, _id: { $lt: id } }]);
  assert.equal(pageCriteria('game', '1000_' + id).gameId, 'game');
  assert.throws(() => pageCriteria('game', {}), { statusCode: 400 });
});

test('Markdown search joins formatted text while preserving literal code', () => {
  const turn = { contentType: 'md', markdown: 'Find ==🔴 **signal**==^42 and `==literal==`' };
  assert.equal(summary(turn, 'find signal').snippet, 'Find signal and ==literal==');
  assert.equal(summary(turn, '^42'), null);
});

function fakeTurns(turns) {
  const calls = [];
  const Turn = {
    find(criteria, fields) {
      calls.push(fields);
      const chain = {
        sort: () => chain, limit: () => chain, lean: () => chain,
        cursor: () => ({ async *[Symbol.asyncIterator]() { yield* turns; }, close: async () => {} }),
      };
      return chain;
    },
  };
  return { Turn, calls };
}

const id = n => String(n).padStart(24, '0');

test('header with repeated spaces matches a single-spaced query', () => {
  assert.equal(summary({ header: 'Hello   world' }, 'hello world').title, 'Hello world');
});

test('empty search reads neither the article nor the translation rows', async () => {
  const { Turn, calls } = fakeTurns([{ _id: id(1), contentType: 'md', paragraph: [{ insert: 'Preview line\n' }] }]);
  const page = await listTurns(Turn, 'game', { q: '' });
  assert.doesNotMatch(calls[0], /markdown|rows/);
  assert.equal(page.items[0].title, 'Preview line');
  await listTurns(Turn, 'game', { q: 'line' });
  assert.match(calls[1], /markdown/);
});

test('search stops the page once the parsed text exceeds the budget', async () => {
  const half = 'x'.repeat(TEXT_BUDGET / 2 + 1);
  const turns = [1, 2, 3].map(n => ({ _id: id(n), createdAt: new Date(n * 1000), contentType: 'md', markdown: half }));
  const { Turn } = fakeTurns(turns);
  const page = await listTurns(Turn, 'game', { q: 'missing' });
  assert.deepEqual(page, { items: [], next: '2000_' + id(2) });
});

test('empty search labels a translation by its preview and leaves a bare article blank', () => {
  const translation = summary({ contentType: 'translation', paragraph: [{ insert: 'Left 1\n' }] }, '');
  assert.equal(translation.title, 'Left 1');
  assert.equal(translation.snippet, 'Left 1');
  assert.equal(translation.column, null);
  const article = summary({ contentType: 'md' }, '');
  assert.equal(article.title, '');
  assert.equal(article.snippet, '');
});

// Honours the cursor criteria, the sort and the limit the way Mongo does; undated turns sort last.
function pagedTurns(all) {
  const stats = { yielded: 0, closed: 0 };
  const time = turn => turn.createdAt ? turn.createdAt.getTime() : -Infinity;
  const order = (a, b) => time(b) - time(a) || (a._id < b._id ? 1 : -1);
  const matches = (turn, criteria) => !criteria.$or || criteria.$or.some(part => {
    if ('_id' in part) {
      const sameTime = part.createdAt === null ? !turn.createdAt : time(turn) === part.createdAt.getTime();
      return sameTime && turn._id < part._id.$lt;
    }
    if (part.createdAt === null) return !turn.createdAt;
    return Boolean(turn.createdAt) && turn.createdAt < part.createdAt.$lt;
  });
  const Turn = {
    find(criteria) {
      let limit = Infinity;
      const chain = {
        sort: () => chain, limit: n => { limit = n; return chain; }, lean: () => chain,
        cursor: () => ({
          async *[Symbol.asyncIterator]() {
            for (const turn of all.filter(t => matches(t, criteria)).sort(order).slice(0, limit)) {
              stats.yielded++;
              yield turn;
            }
          },
          close: async () => { stats.closed++; },
        }),
      };
      return chain;
    },
  };
  return { Turn, stats, sorted: [...all].sort(order).map(turn => turn._id) };
}

// Logs every read of the article, so a turn parsed on two pages is caught.
function loggedTurn(turn, markdown, reads) {
  Object.defineProperty(turn, 'markdown', { enumerable: true, get() { reads.push(turn._id); return markdown; } });
  return turn;
}

async function walk(Turn, q, reads) {
  const pages = [];
  let after;
  do {
    const from = reads.length;
    const page = await listTurns(Turn, 'game', { q, after });
    pages.push({ ...page, read: new Set(reads.slice(from)) });
    after = page.next ?? undefined;
    assert.ok(pages.length < 100, 'pages never end');
  } while (after);
  return pages;
}

function assertReadOnce(pages, count) {
  const seen = new Set();
  for (const page of pages) {
    for (const turnId of page.read) {
      assert.ok(!seen.has(turnId), turnId + ' parsed on two pages');
      seen.add(turnId);
    }
  }
  assert.equal(seen.size, count);
}

test('paging visits every turn once in order despite equal dates, undated turns and the text budget', async () => {
  const reads = [];
  const all = [];
  for (let n = 1; n <= 250; n++) {
    const markdown = n % 25 === 0 ? 'x'.repeat(600 * 1024) : 'line ' + n;
    all.push(loggedTurn({ _id: id(n), contentType: 'md', header: 'turn ' + n,
      createdAt: n % 10 === 3 ? null : new Date(1e12 + (n % 7) * 1000) }, markdown, reads));
  }
  const { Turn, sorted } = pagedTurns(all);

  const found = await walk(Turn, 'turn', reads);
  assert.deepEqual(found.flatMap(page => page.items.map(item => item._id)), sorted);
  assertReadOnce(found, all.length);

  const missed = await walk(Turn, 'missing', reads);
  assert.ok(missed.every(page => page.items.length === 0));
  // 120 scanned turns end a page at most every 120; the budget must end some pages earlier.
  assert.ok(missed.length > Math.ceil(all.length / 120));
  assertReadOnce(missed, all.length);
});

test('a turn larger than the budget fills its page and the next request moves past it', async () => {
  const big = { _id: id(3), createdAt: new Date(3000), contentType: 'md', header: 'big turn', markdown: 'x'.repeat(TEXT_BUDGET + 1) };
  const turns = [
    { _id: id(4), createdAt: new Date(4000), contentType: 'md', header: 'newest turn', markdown: 'small' },
    big,
    { _id: id(2), createdAt: new Date(2000), contentType: 'md', header: 'after turn', markdown: 'small' },
    { _id: id(1), createdAt: new Date(1000), contentType: 'md', header: 'oldest turn', markdown: 'small' },
  ];
  const { Turn } = pagedTurns(turns);
  const first = await listTurns(Turn, 'game', { q: 'turn' });
  assert.deepEqual(first.items.map(item => item.title), ['newest turn', 'big turn']);
  assert.equal(first.next, '3000_' + id(3));
  const second = await listTurns(Turn, 'game', { q: 'turn', after: first.next });
  assert.deepEqual(second.items.map(item => item.title), ['after turn', 'oldest turn']);
  assert.equal(second.next, null);
});

test('a dropped request stops reading and parsing turns', async () => {
  const reads = [];
  const turns = [1, 2, 3, 4, 5, 6].map(n =>
    loggedTurn({ _id: id(7 - n), createdAt: new Date((7 - n) * 1000), contentType: 'md' }, 'text ' + n, reads));
  const { Turn, stats } = pagedTurns(turns);
  const page = await listTurns(Turn, 'game', { q: 'missing' }, () => stats.yielded > 2);
  assert.deepEqual(page, { items: [], next: null });
  assert.deepEqual([...new Set(reads)], [id(6), id(5)]);
  assert.equal(stats.yielded, 3);
  assert.equal(stats.closed, 1);
});

// A search that holds the queue until open() is called; finds counts the reads it started.
function heldSearch() {
  let open;
  const gate = new Promise(resolve => { open = resolve; });
  const stats = { finds: 0 };
  const Turn = {
    find() {
      stats.finds++;
      const chain = {
        sort: () => chain, limit: () => chain, lean: () => chain,
        cursor: () => ({
          async *[Symbol.asyncIterator]() {
            await gate;
            yield { _id: id(1), createdAt: new Date(1000), contentType: 'md', markdown: 'held' };
          },
          close: async () => {},
        }),
      };
      return chain;
    },
  };
  return { Turn, stats, open };
}

const settled = promise => Promise.race([promise.then(() => true, () => true), new Promise(r => setImmediate(() => r(false)))]);

test('two searches parse one after the other, not interleaved', async () => {
  const reads = [];
  const turnsOf = name => [1, 2, 3].map(n =>
    loggedTurn({ _id: id(n), createdAt: new Date(n * 1000), contentType: 'md' }, 'text ' + name + n, reads));
  const first = turnsOf('a');
  const second = turnsOf('b');
  const names = new Map([...first.map(t => [t, 'a']), ...second.map(t => [t, 'b'])]);
  const named = [];
  const wrap = turns => ({ find: (...args) => {
    const chain = pagedTurns(turns).Turn.find(...args);
    const cursor = chain.cursor;
    chain.cursor = () => {
      const inner = cursor();
      return { async *[Symbol.asyncIterator]() { for await (const t of inner) { named.push(names.get(t)); yield t; } },
        close: inner.close };
    };
    return chain;
  } });
  await Promise.all([listTurns(wrap(first), 'game', { q: 'missing' }), listTurns(wrap(second), 'game', { q: 'missing' })]);
  assert.deepEqual(named, ['a', 'a', 'a', 'b', 'b', 'b']);
});

test('an empty search does not wait for a running search', async () => {
  const held = heldSearch();
  const search = listTurns(held.Turn, 'game', { q: 'held' });
  const { Turn } = pagedTurns([{ _id: id(2), createdAt: new Date(2000), contentType: 'comment', header: 'Plain' }]);
  const page = await listTurns(Turn, 'game', { q: '' });
  assert.equal(page.items[0].title, 'Plain');
  assert.equal(await settled(search), false);
  held.open();
  assert.equal((await search).items.length, 1);
});

test('searches beyond the waiting limit are refused with 429 and the rest still finish', async () => {
  const held = heldSearch();
  const running = listTurns(held.Turn, 'game', { q: 'held' });
  await new Promise(r => setImmediate(r));
  const waiting = Array.from({ length: SEARCH_QUEUE_LIMIT }, () => listTurns(pagedTurns([]).Turn, 'game', { q: 'x' }));
  await assert.rejects(listTurns(pagedTurns([]).Turn, 'game', { q: 'x' }), { statusCode: 429 });
  held.open();
  await running;
  for (const page of await Promise.all(waiting)) assert.deepEqual(page, { items: [], next: null });
});

test('a failed search frees the queue for the next one', async () => {
  const broken = { find() { throw new Error('mongo down'); } };
  const failed = listTurns(broken, 'game', { q: 'x' });
  const { Turn } = pagedTurns([{ _id: id(1), createdAt: new Date(1000), contentType: 'comment', header: 'Next one' }]);
  const next = listTurns(Turn, 'game', { q: 'next' });
  await assert.rejects(failed, /mongo down/);
  assert.equal((await next).items[0].title, 'Next one');
});

test('a request dropped while waiting in the queue reads no turns', async () => {
  const held = heldSearch();
  const running = listTurns(held.Turn, 'game', { q: 'held' });
  let gone = false;
  const late = heldSearch();
  const dropped = listTurns(late.Turn, 'game', { q: 'late' }, () => gone);
  gone = true;
  held.open();
  await running;
  assert.deepEqual(await dropped, { items: [], next: null });
  assert.equal(late.stats.finds, 0);
});

test('an article in rows is searched by rows and points at the row, the column and the occurrence', () => {
  const turn = { contentType: 'md', paragraph: [{ insert: 'Intro\n' }],
    rows: [{ id: 'b1', left: '# Intro', right: '' }, { id: 'b2', left: 'Plain text.', right: '' },
      { id: 'b3', left: 'Wait for the **signal** and the signal again.', right: '' }] };
  Object.defineProperty(turn, 'markdown', { get() { throw new Error('the old text must not be read'); } });
  const row = summary(turn, 'the signal');
  assert.deepEqual(row.at, { row: 'b3', column: 'left', nth: 1 });
  assert.equal(row.column, null);
  assert.equal(row.title, 'Intro');
  assert.match(row.snippet, /Wait for the signal/);
});

test('a repeated phrase points at its first row', () => {
  const turn = { contentType: 'md', rows: [{ id: 'b1', left: 'One.' }, { id: 'b2', left: 'echo and echo' },
    { id: 'b3', left: 'echo' }] };
  assert.deepEqual(summary(turn, 'echo').at, { row: 'b2', column: 'left', nth: 1 });
});

test('a translation hit in the right column carries its row', () => {
  const turn = { contentType: 'translation', rows: [{ id: 'r1', left: 'Letter', right: 'Письмо' },
    { id: 'r2', left: 'Wait', right: 'Жди *сигнала*' }] };
  const row = summary(turn, 'жди сигнала');
  assert.equal(row.column, 'right');
  assert.deepEqual(row.at, { row: 'r2', column: 'right', nth: 1 });
});

test('a paragraph and an article not yet in rows point at the occurrence only', () => {
  assert.deepEqual(summary({ contentType: 'comment', paragraph: [{ insert: 'The harbour\n' }] }, 'harbour').at, { nth: 1 });
  assert.deepEqual(summary({ contentType: 'md', markdown: 'Old **article** text' }, 'article text').at, { nth: 1 });
});

test('a hit only in the header, an audio title or an empty search has no place', () => {
  assert.equal('at' in summary({ header: 'Signal', paragraph: [{ insert: 'Body\n' }] }, 'signal'), false);
  assert.equal('at' in summary({ contentType: 'audio', audioTitle: 'Signal song' }, 'signal'), false);
  assert.equal('at' in summary({ contentType: 'md', rows: [{ id: 'b1', left: 'Text' }] }, ''), false);
});

test('search reads the row ids', async () => {
  const { Turn, calls } = fakeTurns([]);
  await listTurns(Turn, 'game', { q: 'x' });
  assert.match(calls[0], /rows\.id/);
});

// Rows larger than the slice in one turn: the event loop must run before the last row is read.
function bigArticle(count, onLastRead) {
  const rows = Array.from({ length: count }, (_, n) => ({ id: 'b' + n, left: 'word '.repeat(PARSE_SLICE / 10) }));
  const last = rows[count - 1];
  const left = last.left;
  let seen = false;
  Object.defineProperty(last, 'left', { enumerable: true, get() { if (!seen) { seen = true; onLastRead(); } return left; } });
  return { _id: id(1), createdAt: new Date(1000), contentType: 'md', rows };
}

test('a large article lets other work run between its rows', async () => {
  let ticks = 0;
  let running = true;
  const tick = () => { ticks++; if (running) setImmediate(tick); };
  setImmediate(tick);
  let ticksAtLast = null;
  const { Turn } = pagedTurns([bigArticle(6, () => { ticksAtLast = ticks; })]);
  const page = await listTurns(Turn, 'game', { q: 'missing' });
  running = false;
  assert.deepEqual(page, { items: [], next: null });
  assert.ok(ticksAtLast > 0, 'no pause inside the turn');
});

test('a request dropped during a pause inside a large article stops reading its rows', async () => {
  let gone = false;
  let lastRead = false;
  setImmediate(() => { gone = true; });
  const { Turn } = pagedTurns([bigArticle(6, () => { lastRead = true; })]);
  const page = await listTurns(Turn, 'game', { q: 'missing' }, () => gone);
  assert.deepEqual(page, { items: [], next: null });
  assert.equal(lastRead, false);
});
