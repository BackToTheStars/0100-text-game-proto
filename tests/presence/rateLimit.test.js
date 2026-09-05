const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createBucket } = require('../../modules/presence/services/rateLimit');
const {
  CAST_RATE_PER_SEC,
  CAST_BURST,
} = require('../../modules/presence/config');

// Ограничитель частоты трансляции гида. Часы подставные — тест проверяет
// пополнение ведра без единого ожидания. Запуск: npm test (node --test).

// Ведро с ручными часами: clock.tick(ms) переводит время вперёд.
const withClock = (options) => {
  let at = 1000;
  const clock = { tick: (ms) => (at += ms) };
  return { bucket: createBucket({ ...options, now: () => at }), clock };
};

const takeMany = (bucket, count) => {
  let passed = 0;
  for (let i = 0; i < count; i++) {
    if (bucket.take()) {
      passed++;
    }
  }
  return passed;
};

describe('cast rate limit', () => {
  it('lets a full burst through and stops the next frame', () => {
    const { bucket } = withClock({
      capacity: CAST_BURST,
      refillPerSec: CAST_RATE_PER_SEC,
    });
    assert.equal(takeMany(bucket, CAST_BURST), CAST_BURST);
    assert.equal(bucket.take(), false);
  });

  it('refills by one frame per 25 ms at 40 frames a second', () => {
    const { bucket, clock } = withClock({ capacity: 40, refillPerSec: 40 });
    takeMany(bucket, 40);
    assert.equal(bucket.take(), false);

    clock.tick(25);
    assert.equal(bucket.take(), true);
    assert.equal(bucket.take(), false);

    clock.tick(10);
    assert.equal(bucket.take(), false);
    clock.tick(15);
    assert.equal(bucket.take(), true);
  });

  it('a second of silence brings the whole burst back, and no more', () => {
    const { bucket, clock } = withClock({ capacity: 40, refillPerSec: 40 });
    takeMany(bucket, 40);
    clock.tick(1000);
    assert.equal(takeMany(bucket, 40), 40);
    assert.equal(bucket.take(), false);
  });

  it('the bucket never grows past its capacity', () => {
    const { bucket, clock } = withClock({ capacity: 40, refillPerSec: 40 });
    clock.tick(60000);
    assert.equal(takeMany(bucket, 100), 40);
  });

  it('a hundred frames in a row pass no more than the burst plus the refill', () => {
    const { bucket, clock } = withClock({ capacity: 40, refillPerSec: 40 });
    let passed = 0;
    for (let i = 0; i < 100; i++) {
      if (bucket.take()) {
        passed++;
      }
      clock.tick(1); // залп «без пауз»: сто кадров за сотню миллисекунд
    }
    // Ведро (40) плюс то, что натекло за эти 100 мс (≈4): в сеть уходит
    // немногим больше залпа, остальное отброшено молча.
    assert.ok(passed >= CAST_BURST, `expected at least 40 frames, got ${passed}`);
    assert.ok(passed <= 45, `expected at most 45 frames, got ${passed}`);
  });

  it('clocks stepping backwards do not empty the bucket', () => {
    let at = 1000;
    const bucket = createBucket({
      capacity: 40,
      refillPerSec: 40,
      now: () => at,
    });
    takeMany(bucket, 40);
    at = 0;
    assert.equal(bucket.take(), false);
    at = 1000;
    assert.equal(bucket.take(), true);
  });
});
