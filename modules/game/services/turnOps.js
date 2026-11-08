const { getError } = require('../../core/services/errors');
const { TURN_OPS_MAX } = require('../../../config/turn');

// Ход правится операциями над свежим документом из базы, а не присылается
// целиком: перевод растёт неделями, тело запроса — нет.

const invalid = (message) => getError(message, 400);

const isObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isId = (value) => typeof value === 'string' && value !== '';

const isSide = (value) => value === undefined || typeof value === 'string';

const isStringOrNull = (value) => value === null || typeof value === 'string';

const isLanguages = (value) =>
  isObject(value) &&
  Object.keys(value).every(
    (key) =>
      (key === 'left' || key === 'right') && typeof value[key] === 'string'
  );

// Поля хода, которые разрешено писать операцией fields.set.
const FIELD_CHECKS = {
  header: (value) => typeof value === 'string',
  dontShowHeader: (value) => typeof value === 'boolean',
  date: isStringOrNull,
  sourceUrl: isStringOrNull,
  languages: isLanguages,
  paragraph: Array.isArray,
};

const TURN_OPS_FIELDS = Object.keys(FIELD_CHECKS);

// Битые записи и повтор id отбрасываются: остаётся первый ряд с таким id.
const storedRows = (rows) => {
  const seen = new Set();
  const result = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !isId(row.id) || seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    result.push({
      id: row.id,
      left: typeof row.left === 'string' ? row.left : '',
      right: typeof row.right === 'string' ? row.right : '',
    });
  }
  return result;
};

const indexOfRow = (rows, id) => rows.findIndex((row) => row.id === id);

const newRow = ({ id, left = '', right = '' }) => ({ id, left, right });

const setSides = (row, { left, right }) => {
  if (left !== undefined) {
    row.left = left;
  }
  if (right !== undefined) {
    row.right = right;
  }
};

// Новый вид операции — новая запись здесь: `check` бросает 400, `apply` меняет
// состояние { rows, fields }, `rows` — операция переписывает ряды хода.
const OPERATIONS = {
  'row.set': {
    rows: true,
    check: (op) => {
      if (!isId(op.id)) {
        throw invalid('row.set: «id» must be a non-empty string');
      }
      if (!isSide(op.left) || !isSide(op.right)) {
        throw invalid('row.set: a side must be a string');
      }
      if (op.left === undefined && op.right === undefined) {
        throw invalid('row.set: «left» or «right» expected');
      }
    },
    // Ряда нет (его убрал другой игрок) — он создаётся в конце: текст важнее.
    apply: ({ rows }, op) => {
      const index = indexOfRow(rows, op.id);
      if (index >= 0) {
        setSides(rows[index], op);
      } else {
        rows.push(newRow(op));
      }
    },
  },
  'row.insert': {
    rows: true,
    check: (op) => {
      if (!isObject(op.row) || !isId(op.row.id)) {
        throw invalid('row.insert: «row.id» must be a non-empty string');
      }
      if (!isSide(op.row.left) || !isSide(op.row.right)) {
        throw invalid('row.insert: a side must be a string');
      }
      if (!('after' in op) || !(op.after === null || isId(op.after))) {
        throw invalid('row.insert: «after» must be a row id or null');
      }
    },
    // Ряд с таким id уже есть — правятся только стороны: повтор запроса безопасен.
    apply: ({ rows }, op) => {
      const index = indexOfRow(rows, op.row.id);
      if (index >= 0) {
        setSides(rows[index], op.row);
        return;
      }
      if (op.after === null) {
        rows.unshift(newRow(op.row));
        return;
      }
      const after = indexOfRow(rows, op.after);
      if (after >= 0) {
        rows.splice(after + 1, 0, newRow(op.row));
      } else {
        rows.push(newRow(op.row));
      }
    },
  },
  'row.remove': {
    rows: true,
    check: (op) => {
      if (!isId(op.id)) {
        throw invalid('row.remove: «id» must be a non-empty string');
      }
    },
    apply: ({ rows }, op) => {
      const index = indexOfRow(rows, op.id);
      if (index >= 0) {
        rows.splice(index, 1);
      }
    },
  },
  'fields.set': {
    rows: false,
    check: (op) => {
      if (!isObject(op.fields) || !Object.keys(op.fields).length) {
        throw invalid('fields.set: «fields» must be a non-empty object');
      }
      for (const [key, value] of Object.entries(op.fields)) {
        if (!Object.hasOwn(FIELD_CHECKS, key)) {
          throw invalid(`fields.set: field "${key}" is not allowed`);
        }
        if (!FIELD_CHECKS[key](value)) {
          throw invalid(`fields.set: wrong value of "${key}"`);
        }
      }
    },
    apply: ({ fields }, op) => {
      Object.assign(fields, op.fields);
    },
  },
};

const checkOp = (op) => {
  if (!isObject(op) || typeof op.op !== 'string') {
    throw invalid('An operation must be an object with «op»');
  }
  if (!Object.hasOwn(OPERATIONS, op.op)) {
    throw invalid(`Unknown operation "${op.op}"`);
  }
  OPERATIONS[op.op].check(op);
};

// Чистая функция: сначала проверяется весь список, потом операции применяются
// по порядку. Возвращает ряды после операций и поля, которые надо записать.
const applyTurnOps = (turn, ops) => {
  if (!Array.isArray(ops) || !ops.length) {
    throw invalid('«ops» must be a non-empty array');
  }
  if (ops.length > TURN_OPS_MAX) {
    throw invalid(`«ops»: at most ${TURN_OPS_MAX} operations`);
  }
  ops.forEach(checkOp);

  const state = { rows: storedRows(turn?.rows), fields: {} };
  for (const op of ops) {
    OPERATIONS[op.op].apply(state, op);
  }
  return state;
};

// Только для списка, уже прошедшего applyTurnOps.
const changesRows = (ops) => ops.some((op) => OPERATIONS[op.op].rows);

module.exports = {
  TURN_OPS_FIELDS,
  applyTurnOps,
  changesRows,
};
