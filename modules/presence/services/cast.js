// Тело кадра cast, которое уйдёт адресатам, или null — тогда отказ bad-cast.
// Чистая функция без сети и без состояния (вынесена из ws.js, чтобы валидация
// тестировалась без сокетов): решает только форму сообщения, не касается того,
// кто отправитель и кому кадр адресован, — это проверяет и решает ws.js.
// Координаты всех видов — координаты холста. Виды viewport, cursor, draw и
// saved шлёт ведущий своим спутникам; viewport-report — спутник своему
// ведущему (видимая область для миникарты).

const { DRAW_MAX_NUMBERS, DRAW_ID_MAX_LENGTH } = require('../config');

const isDrawId = (id) =>
  typeof id === 'string' && id.length >= 1 && id.length <= DRAW_ID_MAX_LENGTH;

const isFiniteNumberArray = (value) =>
  Array.isArray(value) && value.every((n) => Number.isFinite(n));

// Штрих карандаша: пять операций по контракту, пересылаются только
// разрешённые для каждой поля — лишнее (например, случайный "points" в
// "start") отбрасывается, а не проверяется и не пропускается молча.
const drawBody = ({ op, id, x, y, points }) => {
  switch (op) {
    case 'start':
      if (isDrawId(id) && Number.isFinite(x) && Number.isFinite(y)) {
        return { kind: 'draw', op, id, x, y };
      }
      return null;
    case 'move':
      if (
        isDrawId(id) &&
        isFiniteNumberArray(points) &&
        points.length >= 2 &&
        points.length <= DRAW_MAX_NUMBERS &&
        points.length % 2 === 0
      ) {
        return { kind: 'draw', op, id, points };
      }
      return null;
    case 'end':
    case 'remove':
      if (isDrawId(id)) {
        return { kind: 'draw', op, id };
      }
      return null;
    case 'clear':
      return { kind: 'draw', op };
    default:
      return null;
  }
};

const castBody = ({ kind, x, y, off, op, id, points, width, height }) => {
  if (kind === 'viewport' && Number.isFinite(x) && Number.isFinite(y)) {
    return { kind, x, y };
  }
  if (kind === 'cursor') {
    if (off === true) {
      return { kind, off: true };
    }
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { kind, x, y };
    }
    return null;
  }
  if (kind === 'draw') {
    return drawBody({ op, id, x, y, points });
  }
  // Видимая область спутника: левый верхний угол и размер. Нулевой или
  // отрицательный размер — не прямоугольник, такой кадр отвергается.
  if (
    kind === 'viewport-report' &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return { kind, x, y, width, height };
  }
  // Поле сохранено: сигнал без данных, спутники перезапрашивают сами.
  if (kind === 'saved') {
    return { kind };
  }
  return null;
};

module.exports = {
  castBody,
};
