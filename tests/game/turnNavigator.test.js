const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summary, pageCriteria } = require('../../modules/game/services/turnNavigator');

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
