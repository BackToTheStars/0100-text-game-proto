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

const { QUOTE_TYPE_TEXT } = Turn;

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
  const games = await Game.find({
    // _id: '6003eaf6847e8e4fdcf01da3', // suleymani
    // _id: '5ff3deeab303a43cb83b471a', // stamps
    // _id: '60c79a7bcd62d50017876315', // space
    // _id: '603bb95d8d996a07c82f2f4d', // test game
    // '5f7e843151be1669dc611045',
  });

  // 1) Для каждой игры
  for (let game of games) {
    const turns = await Turn.find({ gameId: game._id });
    const gameLog = {
      id: game._id,
      quoteIdSkipped: 0,
      quoteIdUpdated: 0,
      quoteBgUpdated: 0,
      notes: [],
    }; // отчёт об изменениях в рамках одной игры
    //  1.1) Для каждого шага
    for (let turn of turns) {
      //   1.1.1) Пробежаться по всем цитатам в paragraph и добавить id тем, у которых их нет
      if (!ifQuotesInParagraph(turn.paragraph)) continue;
      const quotes = getQuotesFromParagraph(turn.paragraph);

      let quoteIndex = 0;
      for (let i = 0; i < quotes.length; i++) {
        const quote = quotes[i];
        if (quote.attributes.id) {
          gameLog.quoteIdSkipped += 1;
          // gameLog.notes.push(
          //   `id found: turn ${turn._id}, quoteId ${quote.attributes.id} as ${quote.insert}`
          // );
        } else {
          gameLog.quoteIdUpdated += 1;
          quote.attributes.id = quoteIndex += 1;
          // gameLog.notes.push(
          //   `id not found: turn ${turn._id}, quoteIndex ${i} quote ${quote.insert}`
          // );
        }
      }

      // @todo:
      //    1.1.1.2) Протестировать, что у всех цитат есть id и они уникальны в рамках хода

      //   1.1.2) Пробежаться по всем цитатам в paragraph и поменять цвет yellow на hex ?
      let bgUpdated = false;
      for (let quote of quotes) {
        if (quote.attributes.background === 'yellow') {
          gameLog.quoteBgUpdated += 1;
          bgUpdated = true;
          // gameLog.notes.push(
          //   `background updated: turn ${turn._id}, quoteId ${quote.attributes.id} as ${quote.insert}`
          // );
          quote.attributes.background = '#ffff00';
        }
      }

      // @todo:
      //    1.1.2.1) Протестировать, что не осталось цвета yellow

      //   1.1.3) Пробежаться по всем цитатам в paragraph и добавить недостающие в свойство quotes шага
      let quotesFieldUpdated = false;
      const quotesField = [];
      for (let quote of quotes) {
        quotesField.push({
          id: quote.attributes.id,
          type: QUOTE_TYPE_TEXT,
        });
      }
      if (turn.quotes.length !== quotesField.length) {
        quotesFieldUpdated = true;
      } else {
        for (let i = 0; i < turn.quotes.length; i++) {
          if (turn.quotes[i].id !== quotesField[i].id) {
            quotesFieldUpdated = true;
          }
        }
      }

      if (quotesFieldUpdated) {
        gameLog.notes.push(`field quotes updated ${turn._id}`);
        turn.quotes = quotesField;
        turn.markModified('quotes');
      }

      if (quoteIndex || bgUpdated) {
        turn.markModified('paragraph');
      }

      if (quoteIndex || bgUpdated || quotesFieldUpdated) {
        gameLog.notes.push(`turn ${turn._id} updated`);
        await turn.save();
      }
    }

    console.log({ gameLog });
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
