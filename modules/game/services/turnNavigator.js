const MarkdownIt = require('markdown-it');
const { getError } = require('../../core/services/errors');

const md = new MarkdownIt().disable('image');
// The article renderer treats ==text== and ==🔴 text==^123 as highlights.
// Parse them inline so literal delimiters inside code and escapes stay visible.
const highlight = /==(?:[🟡🟢🟣🔵⚪🟠🔴]\uFE0F? ?)?([^=\n](?:[^=\n]|\n(?!\n)|=(?!=))*?)==(?:\^\d+)?/uy;
md.inline.ruler.before('emphasis', 'game_highlight', (state, silent) => {
  if (!state.src.startsWith('==', state.pos)) return false;
  highlight.lastIndex = state.pos;
  const match = highlight.exec(state.src);
  if (!match || highlight.lastIndex > state.posMax) return false;
  const end = highlight.lastIndex;
  if (!silent) {
    const limit = state.posMax;
    const bodyEnd = end - match[0].match(/==(?:\^\d+)?$/)[0].length;
    state.pos = bodyEnd - match[1].length;
    state.posMax = bodyEnd;
    state.md.inline.tokenize(state);
    state.posMax = limit;
  }
  state.pos = end;
  return true;
});
const PAGE_SIZE = 30;
const SCAN_LIMIT = 120;
// About 250 ms of markdown-it per request; a single larger turn is still parsed whole.
const TEXT_BUDGET = 1024 * 1024;
// Without a query the stored plain-text preview is enough, so the bodies are not read or parsed.
const listFields = '_id createdAt contentType header paragraph.insert audioTitle';
const searchFields = listFields + ' markdown rows.left rows.right';

function markdownText(source) {
  if (!source) return '';
  const lines = [];
  for (const token of md.parse(source, {})) {
    if (token.type === 'fence' || token.type === 'code_block') lines.push(token.content);
    if (token.type !== 'inline') continue;
    const line = token.children.map(child => {
      if (child.type === 'softbreak' || child.type === 'hardbreak') return '\n';
      if (child.type === 'text' || child.type === 'code_inline') return child.content;
      return '';
    }).join('');
    lines.push(line);
  }
  return lines.join('\n');
}

function* bodyFields(turn) {
  // These templates store a shortened derived paragraph for the lobby.
  if (turn.contentType === 'md' && turn.markdown) {
    yield [markdownText(turn.markdown)];
    return;
  }
  if (turn.contentType === 'translation' && turn.rows?.length) {
    for (const row of turn.rows) {
      for (const side of ['left', 'right']) {
        if (row?.[side]) yield [markdownText(row[side]), side];
      }
    }
    return;
  }
  if (turn.contentType === 'audio' && turn.audioTitle) yield [turn.audioTitle];
  if (turn.paragraph?.length) {
    yield [turn.paragraph.map(op => typeof op?.insert === 'string' ? op.insert : ' ').join('')];
  }
}

function summary(turn, query) {
  const header = turn.header?.trim().replace(/\s+/g, ' ') || '';
  const matchHeader = header.toLowerCase().indexOf(query);
  let title = header.slice(0, 180);
  let snippet = '';
  let column = null;
  let matched = matchHeader >= 0;
  if (query && matchHeader >= 160) title = '…' + header.slice(matchHeader - 16, matchHeader + query.length + 64);
  for (const [text, side] of bodyFields(turn)) {
    const value = text.trim();
    if (!value) continue;
    if (!title) title = value.split(/\r?\n/, 1)[0].slice(0, 120);
    const normalized = value.replace(/\s+/g, ' ');
    const at = normalized.toLowerCase().indexOf(query);
    if (!snippet || at >= 0) {
      const start = Math.max(0, at - 24);
      snippet = (start ? '…' : '') + normalized.slice(start, start + 180 + query.length);
      column = side || null;
    }
    if (at >= 0 || matched) { matched = true; break; }
  }
  return matched ? { _id: turn._id, contentType: turn.contentType, createdAt: turn.createdAt,
    title, snippet, column } : null;
}

function parsedLength(turn) {
  let length = turn.markdown?.length || 0;
  for (const row of turn.rows || []) length += (row?.left?.length || 0) + (row?.right?.length || 0);
  return length;
}

function pageCriteria(gameId, after) {
  const criteria = { gameId, contentType: { $ne: 'zero-point' } };
  if (after === undefined) return criteria;
  const parts = typeof after === 'string' && /^(-?\d+|null)_([a-f\d]{24})$/i.exec(after);
  if (!parts) throw getError('Invalid turn cursor', 400);
  const [, time, id] = parts;
  const date = time === 'null' ? null : new Date(Number(time));
  if (date && !Number.isFinite(date.getTime())) throw getError('Invalid turn cursor', 400);
  criteria.$or = [{ createdAt: date, _id: { $lt: id } }];
  if (date) criteria.$or.push({ createdAt: { $lt: date } }, { createdAt: null });
  return criteria;
}

async function listTurns(Turn, gameId, { q = '', after }, disconnected) {
  if (typeof q !== 'string' || q.length > 200) throw getError('Invalid turn search', 400);
  const query = q.trim().replace(/\s+/g, ' ').toLowerCase();
  const fields = query ? searchFields : listFields;
  const cursor = Turn.find(pageCriteria(gameId, after), fields).sort({ createdAt: -1, _id: -1 })
    .limit(SCAN_LIMIT + 1).lean().cursor({ batchSize: 8 });
  const items = [];
  let last = null;
  let scanned = 0;
  let parsed = 0;
  try {
    for await (const turn of cursor) {
      if (disconnected?.()) break;
      if (scanned === SCAN_LIMIT || items.length === PAGE_SIZE || parsed >= TEXT_BUDGET) {
        return { items, next: last };
      }
      const item = summary(turn, query);
      if (item) items.push(item);
      scanned++;
      last = (turn.createdAt?.getTime() ?? 'null') + '_' + turn._id;
      const length = parsedLength(turn);
      if (length) {
        parsed += length;
        // Let other requests and the presence socket run between parsed turns.
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    return { items, next: null };
  } finally {
    await cursor.close();
  }
}

module.exports = { listTurns, summary, pageCriteria, TEXT_BUDGET };
