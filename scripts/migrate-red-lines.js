// Game.js (OLD)
const schema = new Schema({
  // ...
  redLogicLines: {
    type: [redLogicLine],
    default: [],
  },
  // ...
});
const redLogicLine = new Schema({
  sourceTurnId: {
    type: mongoose.Types.ObjectId,
  },
  sourceMarker: {
    type: Number,
  },
  targetTurnId: {
    type: mongoose.Types.ObjectId,
  },
  targetMarker: {
    type: Number,
  },
});

// Turn.js (NEW)
const schema2 = new Schema({
  // ...
  quotes: [
    {
      id: Number,
      text: String,
      type: {
        type: String,
        default: QUOTE_TYPE_TEXT,
      },
    },
  ],
  // ...
});
// Line.js
const LineSchema = new Schema(
  {
    gameId: {
      type: mongoose.Types.ObjectId,
    },
    sourceTurnId: {
      type: mongoose.Types.ObjectId,
    },
    sourceMarker: {
      type: Number,
    },
    targetTurnId: {
      type: mongoose.Types.ObjectId,
    },
    targetMarker: {
      type: Number,
    },
    author: String,
    type: {
      type: String,
      default: TYPE_DEFAULT,
    },
    style: Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Проверить количество цитат до изменений и после.

// 1) Пробежаться по всем цитатам в paragraph и добавить id тем, у которых их нет
//  1.1) Протестировать, что у всех цитат есть id и они уникальны в рамках хода
// 2) Пробежаться по всем цитатам в paragraph и поменять цвет yellow на hex
//  2.1) Протестировать, что не осталось цвета yellow
// 3) Пробежаться по всем цитатам в paragraph и добавить недостающие в свойство quotes шага
// 4) Для каждой игры
//  4.1) Пробежаться по redLogicLines. Для каждого source и target
//    4.1.1) Взять цитату по порядковому номеру
//    4.1.2) Проверить, что она существует в шаге. Зафиксировать ошибку при необходимости
//  4.2) В случае успешной проверки source и target добавить новый объект Line в БД (если его ещё нет)
//  4.3) Проверить, что количество цитат в параграфах, шагах и линиях правильное (нет лишних, нет недостающих)
