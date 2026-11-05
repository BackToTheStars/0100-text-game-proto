const { getError } = require('../../core/services/errors');

// Ряды хода перевода правятся операциями над свежими рядами из базы, а не
// присылаются целиком: перевод растёт неделями, тело запроса — нет.

const invalid = (message) => getError(message, 400);

const isNonEmptyString = (value) => typeof value === 'string' && value !== '';

const isPlainObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const requireIdList = (list, name) => {
  if (list === undefined) {
    return [];
  }
  if (!Array.isArray(list)) {
    throw invalid(`«${name}» must be an array of row ids`);
  }
  const seen = new Set();
  for (const id of list) {
    if (!isNonEmptyString(id)) {
      throw invalid(`«${name}»: a row id must be a non-empty string`);
    }
    if (seen.has(id)) {
      throw invalid(`«${name}»: row id "${id}" repeats`);
    }
    seen.add(id);
  }
  return list;
};

const requireSide = (value, side, id) => {
  if (value !== undefined && typeof value !== 'string') {
    throw invalid(`«upsert»: ${side} of row "${id}" must be a string`);
  }
  return value;
};

const requireUpsert = (upsert) => {
  if (upsert === undefined) {
    return [];
  }
  if (!Array.isArray(upsert)) {
    throw invalid('«upsert» must be an array of rows');
  }
  const seen = new Set();
  return upsert.map((row) => {
    if (!isPlainObject(row)) {
      throw invalid('«upsert»: a row must be an object { id, left?, right? }');
    }
    const { id, left, right } = row;
    if (!isNonEmptyString(id)) {
      throw invalid('«upsert»: a row id must be a non-empty string');
    }
    if (seen.has(id)) {
      throw invalid(`«upsert»: row id "${id}" repeats`);
    }
    seen.add(id);
    return {
      id,
      left: requireSide(left, 'left', id),
      right: requireSide(right, 'right', id),
    };
  });
};

const toStoredRow = (row) => ({
  id: String(row.id),
  left: typeof row.left === 'string' ? row.left : '',
  right: typeof row.right === 'string' ? row.right : '',
});

// Чистая функция: `rows` — ряды из базы, `ops` — тело PUT /turns/:id/rows.
// Присланная сторона заменяет свою, неприсланная остаётся; новые ряды — в конец
// (или по `order`); `remove` незнакомого id — не ошибка (его мог убрать другой
// игрок); `order` обязан быть перестановкой итоговых id. Возвращает новый массив.
const applyRowOps = (rows, ops) => {
  if (!isPlainObject(ops)) {
    throw invalid('Body must be an object { upsert?, remove?, order? }');
  }
  const upsert = requireUpsert(ops.upsert);
  const remove = requireIdList(ops.remove, 'remove');
  const order = ops.order === undefined ? null : requireIdList(ops.order, 'order');
  if (!upsert.length && !remove.length && !order) {
    throw invalid('Nothing to apply: «upsert», «remove» or «order» expected');
  }

  const removed = new Set(remove);
  for (const { id } of upsert) {
    if (removed.has(id)) {
      throw invalid(`Row id "${id}" is both in «upsert» and «remove»`);
    }
  }

  const result = (Array.isArray(rows) ? rows : [])
    .filter((row) => row && isNonEmptyString(row.id) && !removed.has(row.id))
    .map(toStoredRow);
  const byId = new Map(result.map((row) => [row.id, row]));

  for (const { id, left, right } of upsert) {
    const existing = byId.get(id);
    if (existing) {
      if (left !== undefined) {
        existing.left = left;
      }
      if (right !== undefined) {
        existing.right = right;
      }
    } else {
      const row = toStoredRow({ id, left, right });
      result.push(row);
      byId.set(id, row);
    }
  }

  if (!order) {
    return result;
  }
  if (order.length !== result.length || !order.every((id) => byId.has(id))) {
    throw invalid('«order» must list every row id of the turn exactly once');
  }
  return order.map((id) => byId.get(id));
};

module.exports = {
  applyRowOps,
};
