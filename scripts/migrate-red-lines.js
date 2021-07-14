// // Game.js (OLD)
// const schema = new Schema({
//   // ...
//   redLogicLines: {
//     type: [redLogicLine],
//     default: [],
//   },
//   // ...
// });
// const redLogicLine = new Schema({
//   sourceTurnId: {
//     type: mongoose.Types.ObjectId,
//   },
//   sourceMarker: {
//     type: Number,
//   },
//   targetTurnId: {
//     type: mongoose.Types.ObjectId,
//   },
//   targetMarker: {
//     type: Number,
//   },
// });

// // Turn.js (NEW)
// const schema2 = new Schema({
//   // ...
//   quotes: [
//     {
//       id: Number,
//       text: String,
//       type: {
//         type: String,
//         default: QUOTE_TYPE_TEXT,
//       },
//     },
//   ],
//   // ...
// });
// // Line.js
// const LineSchema = new Schema(
//   {
//     gameId: {
//       type: mongoose.Types.ObjectId,
//     },
//     sourceTurnId: {
//       type: mongoose.Types.ObjectId,
//     },
//     sourceMarker: {
//       type: Number,
//     },
//     targetTurnId: {
//       type: mongoose.Types.ObjectId,
//     },
//     targetMarker: {
//       type: Number,
//     },
//     author: String,
//     type: {
//       type: String,
//       default: TYPE_DEFAULT,
//     },
//     style: Schema.Types.Mixed,
//   },
//   { timestamps: true }
// );

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

require('../models/db');
const Game = require('../models/Game');
const Turn = require('../models/Turn');
const Line = require('../models/Line');

function ifQuotesInParagraph(paragraph) {
  if (!paragraph) return false;
  if (!paragraph.length) return false;

  return !!paragraph.filter((quote) => {
    if (!quote.attributes) {
      return false;
    }
    if (!quote.attributes.background) {
      return false;
    }
    return true;
  }).length;
}

function getQuotesFromParagraph(paragraph) {
  return paragraph.filter((quote) => {
    if (!quote.attributes || !quote.attributes.background) return false;
    return true;
  });
}

// Проверить количество цитат до изменений и после.
async function start() {
  const games = await Game.find();

  // 1) Для каждой игры
  for (let game of games) {
    const turns = await Turn.find({ gameId: game._id });
    //  1.1) Для каждого шага
    for (let turn of turns) {
      //   1.1.1) Пробежаться по всем цитатам в paragraph и добавить id тем, у которых их нет
      if (!ifQuotesInParagraph(turn.paragraph)) continue;
      const quotes = getQuotesFromParagraph(turn.paragraph);

      for (let i = 0; i < quotes.length; i++) {
        const quote = quotes[i];
        if (quote.attributes.id) {
          console.log(
            `id found: turn ${turn._id}, quoteId ${quote.attributes.id} as ${quote.insert}`
          );
        } else {
          console.log(
            `id not found: turn ${turn._id}, quoteIndex ${i} quote ${quote.insert}`
          );
        }
      }

      //    1.1.1.2) Протестировать, что у всех цитат есть id и они уникальны в рамках хода
      //   1.1.2) Пробежаться по всем цитатам в paragraph и поменять цвет yellow на hex ?
      //    1.1.2.1) Протестировать, что не осталось цвета yellow
      //   1.1.3) Пробежаться по всем цитатам в paragraph и добавить недостающие в свойство quotes шага
    }
  }

  //
  // 2) Для каждой игры
  //  2.1) Пробежаться по redLogicLines. Для каждого source и target
  //    2.1.1) Взять цитату по порядковому номеру
  //    2.1.2) Проверить, что она существует в шаге. Зафиксировать ошибку при необходимости
  //  2.2) В случае успешной проверки source и target добавить новый объект Line в БД (если его ещё нет)
  //  2.3) Проверить, что количество цитат в параграфах, шагах и линиях правильное (нет лишних, нет недостающих)
  process.exit();
}
start();
