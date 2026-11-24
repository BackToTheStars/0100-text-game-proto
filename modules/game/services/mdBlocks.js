const crypto = require('node:crypto');
const MarkdownIt = require('markdown-it');

// Деление статьи md на блоки — ряды { id, left, right: '' }. Клиент делит так же своей копией; общие примеры
// лежат в tests/game/fixtures/mdBlocksCases.json, и обе реализации обязаны сходиться с ними побайтно.
// Блок — блок верхнего уровня markdown-it; строки вне блоков (определения ссылок) — свой блок; пустые строки
// между блоками отбрасываются. Блок больше BLOCK_LIMIT байт UTF-8 делится: таблица — по строкам с повтором
// шапки, список — по пунктам, ограждённый код — по строкам с повтором ограждения, код с отступом и цитата-блок —
// по строкам, прочее — по предложениям; выделение ==…==^id не разрезается. Часть, которую делить дальше нечем,
// остаётся больше предела.

const BLOCK_LIMIT = 16 * 1024;
// Опции — как у рендера статьи на клиенте: от них зависят границы блоков.
const md = new MarkdownIt('default', { html: false, linkify: true, breaks: true }).disable('image');
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const HIGHLIGHT = /==(?:[^=\n]|=(?!=)|\n(?!\n))+?==(?:\^\d+)?/g;
const SENTENCE_END = /[.!?…]["')\]»]*[ \n]+/g;

const trimBlank = (lines) => {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === '') a += 1;
  while (b > a && lines[b - 1].trim() === '') b -= 1;
  return lines.slice(a, b);
};

const pushLoose = (lines, from, to, out) => {
  let start = null;
  for (let i = from; i <= to; i += 1) {
    const blank = i === to || lines[i].trim() === '';
    if (!blank && start === null) start = i;
    if (blank && start !== null) {
      out.push({ start, end: i, type: 'loose' });
      start = null;
    }
  }
};

const topBlocks = (lines, tokens) => {
  const out = [];
  let line = 0;
  for (const token of tokens) {
    if (token.level !== 0 || !token.map || token.nesting === -1) continue;
    const [start, end] = token.map;
    if (start > line) pushLoose(lines, line, start, out);
    out.push({ start, end, type: token.type });
    line = Math.max(line, end);
  }
  if (line < lines.length) pushLoose(lines, line, lines.length, out);
  return out
    .map((span) => ({ type: span.type, text: trimBlank(lines.slice(span.start, span.end)).join('\n') }))
    .filter((block) => block.text.trim() !== '');
};

// Жадно собирает куски не больше limit; кусок больше limit сам по себе — отдельной частью.
const pack = (pieces, limit, glue, wrap = (body) => body) => {
  const parts = [];
  let current = [];
  for (const piece of pieces) {
    const next = [...current, piece];
    if (current.length && bytes(wrap(next.join(glue))) > limit) {
      parts.push(wrap(current.join(glue)));
      current = [piece];
    } else {
      current = next;
    }
  }
  if (current.length) parts.push(wrap(current.join(glue)));
  return parts;
};

const splitTable = (text, limit) => {
  const rows = text.split('\n');
  const head = rows.slice(0, 2).join('\n');
  return pack(rows.slice(2), limit, '\n', (body) => `${head}\n${body}`);
};

const splitFence = (text, limit) => {
  const rows = text.split('\n');
  const open = rows[0];
  const closed = rows.length > 1 && /^\s*(`{3,}|~{3,})\s*$/.test(rows[rows.length - 1]);
  const close = closed ? rows[rows.length - 1] : open.match(/^\s*(`{3,}|~{3,})/)[1];
  const body = rows.slice(1, closed ? -1 : undefined);
  return pack(body, limit, '\n', (inner) => `${open}\n${inner}\n${close}`);
};

const topItems = (text) =>
  md.parse(text, {}).filter((t) => t.type === 'list_item_open' && t.level === 1);

// Номер первого пункта части — его порядковый номер во всём списке.
const splitList = (text, limit, ordered) => {
  const items = topItems(text).map((t) => t.map);
  const lines = text.split('\n');
  const pieces = items.map(([start], i) =>
    trimBlank(lines.slice(start, i + 1 < items.length ? items[i + 1][0] : lines.length)).join('\n'));
  const loose = /\n\s*\n/.test(text);
  const parts = pack(pieces, limit, loose ? '\n\n' : '\n');
  if (!ordered) return parts;
  let index = Number((lines[0].match(/^\s*(\d+)[.)]/) || [])[1] || 1);
  return parts.map((part) => {
    const renumbered = part.replace(/^(\s*)\d+([.)])/, `$1${index}$2`);
    index += topItems(part).length;
    return renumbered;
  });
};

const sentences = (text) => {
  const guarded = [];
  for (const m of text.matchAll(HIGHLIGHT)) guarded.push([m.index, m.index + m[0].length]);
  const inside = (pos) => guarded.some(([a, b]) => pos > a && pos < b);
  const pieces = [];
  let start = 0;
  for (const m of text.matchAll(SENTENCE_END)) {
    const cut = m.index + m[0].length;
    if (inside(cut)) continue;
    pieces.push(text.slice(start, cut));
    start = cut;
  }
  if (start < text.length) pieces.push(text.slice(start));
  return pieces.filter((piece) => piece !== '');
};

const splitLarge = (block, limit) => {
  if (bytes(block.text) <= limit) return [block.text];
  switch (block.type) {
    case 'table_open': return splitTable(block.text, limit);
    case 'fence': return splitFence(block.text, limit);
    case 'bullet_list_open': return splitList(block.text, limit, false);
    case 'ordered_list_open': return splitList(block.text, limit, true);
    case 'code_block':
    case 'blockquote_open':
    case 'loose': return pack(block.text.split('\n'), limit, '\n');
    // разделители предложений остаются как были, край части обрезается
    default: return pack(sentences(block.text), limit, '').map((part) => part.trim());
  }
};

// oversized — сколько блоков верхнего уровня было больше предела и поделено (для отчёта миграции).
const splitBlocksCounted = (source, { limit = BLOCK_LIMIT } = {}) => {
  const text = String(source ?? '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const blocks = [];
  let oversized = 0;
  for (const block of topBlocks(lines, md.parse(text, {}))) {
    const parts = splitLarge(block, limit);
    if (parts.length > 1) oversized += 1;
    blocks.push(...parts);
  }
  return { blocks, oversized };
};

const splitBlocks = (source, options) => splitBlocksCounted(source, options).blocks;

const joinBlocks = (blocks) => blocks.join('\n\n');

// Та же форма, что у id нового ряда на клиенте: время в base36 и шесть случайных знаков.
const newBlockId = (now = Date.now()) =>
  `${now.toString(36)}${crypto.randomInt(36 ** 6).toString(36).padStart(6, '0')}`;

const rowsFromBlocks = (blocks) => {
  const seen = new Set();
  return blocks.map((left) => {
    let id = newBlockId();
    while (seen.has(id)) id = newBlockId();
    seen.add(id);
    return { id, left, right: '' };
  });
};

const rowsFromMarkdown = (source, options) => rowsFromBlocks(splitBlocks(source, options));

const markdownFromRows = (rows) =>
  joinBlocks((rows || []).map((row) => (typeof row?.left === 'string' ? row.left : '')));

module.exports = {
  BLOCK_LIMIT,
  splitBlocks,
  splitBlocksCounted,
  joinBlocks,
  newBlockId,
  rowsFromBlocks,
  rowsFromMarkdown,
  markdownFromRows,
};
