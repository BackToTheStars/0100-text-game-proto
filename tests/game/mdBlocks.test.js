const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  BLOCK_LIMIT,
  splitBlocks,
  joinBlocks,
  newBlockId,
  rowsFromMarkdown,
  markdownFromRows,
} = require('../../modules/game/services/mdBlocks');
// Побайтная копия brain-platform/scripts/md-blocks/cases.json — общая с клиентом.
const { limitDefault, cases } = require('./fixtures/mdBlocksCases.json');

describe('article split into blocks: shared cases', () => {
  it('the default limit is the shared one', () => {
    assert.equal(BLOCK_LIMIT, limitDefault);
  });

  for (const c of cases) {
    it(c.name, () => {
      assert.deepEqual(splitBlocks(c.source, c.limit ? { limit: c.limit } : {}), c.blocks);
    });
  }
});

describe('article blocks as rows', () => {
  it('joining the blocks and splitting again gives the same blocks', () => {
    for (const c of cases) {
      if (c.limit) continue;
      assert.deepEqual(splitBlocks(joinBlocks(c.blocks)), c.blocks, c.name);
    }
  });

  it('a block id has the client row id form', () => {
    assert.match(newBlockId(), /^[0-9a-z]{8,}[0-9a-z]{6}$/);
    assert.equal(newBlockId(0).length, 7);
  });

  it('rows get unique ids, the text in left and an empty right', () => {
    const rows = rowsFromMarkdown('# Title\n\nFirst ==🔴 quote==^1700000000001.\n\n- a\n- b');
    assert.deepEqual(rows.map((row) => row.left), ['# Title', 'First ==🔴 quote==^1700000000001.', '- a\n- b']);
    assert.ok(rows.every((row) => row.right === ''));
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  });

  it('two thousand blocks in one call never repeat an id', () => {
    const rows = rowsFromMarkdown(Array.from({ length: 2000 }, (_, i) => `Paragraph ${i}.`).join('\n\n'));
    assert.equal(rows.length, 2000);
    assert.equal(new Set(rows.map((row) => row.id)).size, 2000);
  });

  it('rows join back with blank lines', () => {
    assert.equal(markdownFromRows([{ left: 'a' }, { left: 'b\nc' }, {}]), 'a\n\nb\nc\n\n');
    assert.equal(markdownFromRows(undefined), '');
  });
});
