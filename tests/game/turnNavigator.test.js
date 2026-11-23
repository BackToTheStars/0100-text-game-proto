const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listTurns, summary, pageCriteria, TEXT_BUDGET } = require('../../modules/game/services/turnNavigator');

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
