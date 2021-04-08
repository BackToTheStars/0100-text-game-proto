const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

require('../models/db');
const Game = require('../models/Game');
const Turn = require('../models/Turn');

// const addWorldMapZeroPoint = async () => {
//   const games = await Game.find();
//   console.log(games.length);
//   try {
//     for (let game of games) {
//       await Game.addZeroPointTurn(game._id);
//     }
//   } catch (err) {
//     console.log({ err });
//   }

//   process.exit(0);
// };

// addWorldMapZeroPoint();    // закомментировали для безопасности при случайном запуске

// const resetZeroPoints = async () => {
//   const game = await Game.findOne({
//     name: 'Тестовая игра 1',
//   });
//   try {
//     await Game.adjustZeroPointTurnToZeroZero(game._id);
//   } catch (err) {
//     console.log({ err });
//   }

//   process.exit(0);
// };

// resetZeroPoints(); // закомментировали для безопасности при случайном запуске
// resetZeroPoints();

const tmp = async () => {
  const game = await Game.findOne({
    name: 'Тестовая игра 1',
  });
  try {
    const codes = [];
    for (let code of game.codes) {
      codes.push({
        ...code.toObject(),
        viewportPointX: 500,
        viewportPointY: 500,
      });
    }
    game.codes = codes;
    game.markModified('codes');
    await game.save();
  } catch (err) {
    console.log({ err });
  }

  process.exit(0);
};
tmp();
