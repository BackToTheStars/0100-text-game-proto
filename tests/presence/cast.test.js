const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { castBody } = require('../../modules/presence/services/cast');
const {
  DRAW_MAX_NUMBERS,
  DRAW_ID_MAX_LENGTH,
} = require('../../modules/presence/config');

// Валидация тела cast: форма кадра, который уйдёт подписчикам гида, — без
// сети и без состояния комнаты (то, гид ли отправитель, проверяет ws.js).
// Виды viewport и cursor — прежнее поведение волны 21, здесь для полноты;
// draw — пять операций штриха карандаша по контракту. Запуск: npm test
// (node --test).

describe('cast body: viewport and cursor (unchanged behaviour)', () => {
  it('viewport passes through finite x/y and drops unknown fields', () => {
    assert.deepEqual(castBody({ kind: 'viewport', x: 1, y: 2, extra: 'x' }), {
      kind: 'viewport',
      x: 1,
      y: 2,
    });
  });

  it('viewport with a non-finite coordinate is refused', () => {
    assert.equal(castBody({ kind: 'viewport', x: 'a', y: 2 }), null);
    assert.equal(castBody({ kind: 'viewport', x: Infinity, y: 2 }), null);
  });

  it('cursor off carries no coordinates even if some were sent', () => {
    assert.deepEqual(castBody({ kind: 'cursor', off: true, x: 1, y: 2 }), {
      kind: 'cursor',
      off: true,
    });
  });

  it('cursor with finite x/y passes; a non-finite one is refused', () => {
    assert.deepEqual(castBody({ kind: 'cursor', x: 10, y: 20 }), {
      kind: 'cursor',
      x: 10,
      y: 20,
    });
    assert.equal(castBody({ kind: 'cursor', x: 'a', y: 2 }), null);
  });
});

describe('cast body: draw', () => {
  it('start passes id, x, y and drops unknown fields', () => {
    assert.deepEqual(
      castBody({
        kind: 'draw',
        op: 'start',
        id: 'a1b2c3d4',
        x: 5,
        y: 6,
        points: [1, 2],
      }),
      { kind: 'draw', op: 'start', id: 'a1b2c3d4', x: 5, y: 6 }
    );
  });

  it('start refuses a missing or non-finite coordinate', () => {
    assert.equal(castBody({ kind: 'draw', op: 'start', id: 'a', y: 2 }), null);
    assert.equal(
      castBody({ kind: 'draw', op: 'start', id: 'a', x: NaN, y: 2 }),
      null
    );
  });

  it('start refuses a missing, empty, or too-long id', () => {
    assert.equal(castBody({ kind: 'draw', op: 'start', x: 1, y: 2 }), null);
    assert.equal(
      castBody({ kind: 'draw', op: 'start', id: '', x: 1, y: 2 }),
      null
    );
    assert.equal(
      castBody({
        kind: 'draw',
        op: 'start',
        id: 'x'.repeat(DRAW_ID_MAX_LENGTH + 1),
        x: 1,
        y: 2,
      }),
      null
    );
  });

  it('start accepts an id at exactly the length limit', () => {
    const id = 'x'.repeat(DRAW_ID_MAX_LENGTH);
    assert.deepEqual(castBody({ kind: 'draw', op: 'start', id, x: 1, y: 2 }), {
      kind: 'draw',
      op: 'start',
      id,
      x: 1,
      y: 2,
    });
  });

  it('move passes id and points, drops unknown fields', () => {
    assert.deepEqual(
      castBody({ kind: 'draw', op: 'move', id: 'a', points: [1, 2, 3, 4], x: 9 }),
      { kind: 'draw', op: 'move', id: 'a', points: [1, 2, 3, 4] }
    );
  });

  it('move accepts exactly the maximum number count', () => {
    const points = Array.from({ length: DRAW_MAX_NUMBERS }, (_, i) => i);
    assert.deepEqual(castBody({ kind: 'draw', op: 'move', id: 'a', points }), {
      kind: 'draw',
      op: 'move',
      id: 'a',
      points,
    });
  });

  it('move refuses one number over the maximum (301)', () => {
    const points = Array.from({ length: DRAW_MAX_NUMBERS + 1 }, (_, i) => i);
    assert.equal(castBody({ kind: 'draw', op: 'move', id: 'a', points }), null);
  });

  it('move refuses an odd-length points array', () => {
    assert.equal(
      castBody({ kind: 'draw', op: 'move', id: 'a', points: [1, 2, 3] }),
      null
    );
  });

  it('move refuses fewer than two numbers, a NaN, or a non-array', () => {
    assert.equal(castBody({ kind: 'draw', op: 'move', id: 'a', points: [] }), null);
    assert.equal(
      castBody({ kind: 'draw', op: 'move', id: 'a', points: [1, NaN] }),
      null
    );
    assert.equal(
      castBody({ kind: 'draw', op: 'move', id: 'a', points: 'nope' }),
      null
    );
  });

  it('move refuses a missing id', () => {
    assert.equal(
      castBody({ kind: 'draw', op: 'move', points: [1, 2] }),
      null
    );
  });

  it('end and remove pass only id and drop the rest', () => {
    assert.deepEqual(castBody({ kind: 'draw', op: 'end', id: 'a', x: 1 }), {
      kind: 'draw',
      op: 'end',
      id: 'a',
    });
    assert.deepEqual(
      castBody({ kind: 'draw', op: 'remove', id: 'a', points: [1, 2] }),
      { kind: 'draw', op: 'remove', id: 'a' }
    );
  });

  it('end and remove refuse a missing id', () => {
    assert.equal(castBody({ kind: 'draw', op: 'end' }), null);
    assert.equal(castBody({ kind: 'draw', op: 'remove' }), null);
  });

  it('clear carries no fields at all', () => {
    assert.deepEqual(
      castBody({ kind: 'draw', op: 'clear', id: 'a', x: 1, points: [1, 2] }),
      { kind: 'draw', op: 'clear' }
    );
  });

  it('an unknown op is refused', () => {
    assert.equal(castBody({ kind: 'draw', op: 'wipe', id: 'a' }), null);
    assert.equal(castBody({ kind: 'draw', id: 'a' }), null);
  });

  it('an unknown kind is refused', () => {
    assert.equal(castBody({ kind: 'sparkle', x: 1, y: 2 }), null);
  });
});
