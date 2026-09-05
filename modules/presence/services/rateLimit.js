// Ограничитель частоты для трансляции гида: token bucket на соединение.
// Ведро вмещает capacity кадров и пополняется на refillPerSec в секунду;
// take() отдаёт true, если кадр можно пропустить, и false, если ведро пусто.
// Пустое ведро — не ошибка: ws.js молча отбрасывает лишний кадр, потому что
// курсор идёт потоком и отвечать на каждый лишний кадр ошибкой значило бы
// удвоить трафик в обратную сторону.
//
// Часы инжектируются (now), чтобы тест проверял пополнение без ожиданий.
// Никакого таймера внутри нет: ведро пополняется в момент обращения.

const createBucket = ({ capacity, refillPerSec, now = Date.now }) => {
  let tokens = capacity;
  let filledAt = now();

  return {
    take: () => {
      const at = now();
      // Часы, шагнувшие назад, не должны опустошать ведро.
      const elapsed = Math.max(0, at - filledAt);
      filledAt = at;
      tokens = Math.min(capacity, tokens + (elapsed / 1000) * refillPerSec);
      if (tokens < 1) {
        return false;
      }
      tokens -= 1;
      return true;
    },
  };
};

module.exports = {
  createBucket,
};
