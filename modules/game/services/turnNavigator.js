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
const searchFields = listFields + ' markdown rows.id rows.left rows.right';
// Inside one large turn the loop is yielded between rows after about this much source (~16 ms of markdown-it).
const PARSE_SLICE = 64 * 1024;
const DROPPED = Symbol('dropped');
// One search parses at a time in this process: parallel searches would interleave their parse slices,
// and every other request would wait behind all of them (10 searches: ~1 s for a light request).
const SEARCH_QUEUE_LIMIT = 8;
let searchTail = Promise.resolve();
let searchWaiting = 0;

async function inSearchQueue(task) {
  if (searchWaiting >= SEARCH_QUEUE_LIMIT) throw getError('Search is busy, try again', 429);
  searchWaiting++;
  const previous = searchTail;
  let release;
  searchTail = new Promise(resolve => { release = resolve; });
  try {
    await previous;
  } finally {
    searchWaiting--;
  }
  try {
    return await task();
  } finally {
    release();
  }
}

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

const articleInRows = turn => turn.contentType === 'md' && turn.rows?.length > 0;

// Body texts in reading order. `place` is where a hit lies for the client: the row and column of an article
// or a translation, the whole text of a paragraph or a not yet split article; none for an audio title.
function* bodyFields(turn) {
  // These templates store a shortened derived paragraph for the lobby.
  if (articleInRows(turn)) {
    for (const row of turn.rows) {
      if (row?.left) yield { text: markdownText(row.left), size: row.left.length, place: { row: row.id, column: 'left' } };
    }
    return;
  }
  if (turn.contentType === 'md' && turn.markdown) {
    yield { text: markdownText(turn.markdown), size: turn.markdown.length, place: {} };
    return;
  }
  if (turn.contentType === 'translation' && turn.rows?.length) {
    for (const row of turn.rows) {
      for (const side of ['left', 'right']) {
        if (row?.[side]) {
          yield { text: markdownText(row[side]), size: row[side].length, side, place: { row: row.id, column: side } };
        }
      }
    }
    return;
  }
  if (turn.contentType === 'audio' && turn.audioTitle) yield { text: turn.audioTitle, size: 0 };
  if (turn.paragraph?.length) {
    yield { text: turn.paragraph.map(op => typeof op?.insert === 'string' ? op.insert : ' ').join(''), size: 0, place: {} };
  }
}

// Number of the occurrence at `index`, counted from 1 in the collapsed, lower-cased text the client also counts in.
function occurrence(text, query, index) {
  let nth = 0;
  for (let i = text.indexOf(query); i >= 0 && i <= index; i = text.indexOf(query, i + query.length)) nth++;
  return nth;
}

// Yields the source size of every body text it has read, so a caller can pause between rows.
function* scan(turn, query) {
  const header = turn.header?.trim().replace(/\s+/g, ' ') || '';
  const matchHeader = header.toLowerCase().indexOf(query);
  let title = header.slice(0, 180);
  let snippet = '';
  let column = null;
  let at = null;
  let matched = matchHeader >= 0;
  if (query && matchHeader >= 160) title = '…' + header.slice(matchHeader - 16, matchHeader + query.length + 64);
  for (const field of bodyFields(turn)) {
    const value = field.text.trim();
    if (value) {
      if (!title) title = value.split(/\r?\n/, 1)[0].slice(0, 120);
      const normalized = value.replace(/\s+/g, ' ');
      const lower = normalized.toLowerCase();
      const hit = lower.indexOf(query);
      if (!snippet || hit >= 0) {
        const start = Math.max(0, hit - 24);
        snippet = (start ? '…' : '') + normalized.slice(start, start + 180 + query.length);
        column = field.side || null;
        at = query && hit >= 0 && field.place ? { ...field.place, nth: occurrence(lower, query, hit) } : null;
      }
      if (hit >= 0 || matched) { matched = true; break; }
    }
    yield field.size;
  }
  if (!matched) return null;
  const item = { _id: turn._id, contentType: turn.contentType, createdAt: turn.createdAt, title, snippet, column };
  if (at) item.at = at;
  return item;
}

function summary(turn, query) {
  const steps = scan(turn, query);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

// The same as summary, but a large turn lets other requests run between its rows.
async function summarize(turn, query, disconnected) {
  const steps = scan(turn, query);
  let slice = 0;
  for (let step = steps.next(); ; step = steps.next()) {
    if (step.done) return step.value;
    slice += step.value;
    if (slice >= PARSE_SLICE) {
      slice = 0;
      await new Promise(resolve => setImmediate(resolve));
      if (disconnected?.()) return DROPPED;
    }
  }
}

function parsedLength(turn) {
  let length = articleInRows(turn) ? 0 : turn.markdown?.length || 0;
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
  const criteria = pageCriteria(gameId, after);
  if (!query) return readPage(Turn, criteria, query, disconnected);
  return inSearchQueue(() => disconnected?.()
    ? { items: [], next: null }
    : readPage(Turn, criteria, query, disconnected));
}

async function readPage(Turn, criteria, query, disconnected) {
  const fields = query ? searchFields : listFields;
  const cursor = Turn.find(criteria, fields).sort({ createdAt: -1, _id: -1 })
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
      const item = query ? await summarize(turn, query, disconnected) : summary(turn, query);
      if (item === DROPPED) break;
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

module.exports = { listTurns, summary, pageCriteria, TEXT_BUDGET, SEARCH_QUEUE_LIMIT, PARSE_SLICE };
