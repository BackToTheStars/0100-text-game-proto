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

// addWorldMapZeroPoint(); // закомментировали для безопасности при случайном запуске

// const resetZeroPoints = async () => {
//   const game = await Game.findOne({
//     name: 'Game for interface demonstration',
//   });
//   try {
//     await Game.adjustZeroPointTurnToZeroZero(game._id);
//   } catch (err) {
//     console.log({ err });
//   }

//   process.exit(0);
// };

// const resetZeroPointsInAllGames = async () => {
//   const games = await Game.find();
//   for (let game of games) {
//     try {
//       await Game.adjustZeroPointTurnToZeroZero(game._id);
//     } catch (err) {
//       console.log({ err });
//     }
//   }
//   process.exit(0);
// };

// resetZeroPointsInAllGames();

const checkZeroPointsInAllGames = async () => {
  const games = await Game.find();
  for (let game of games) {
    try {
      const existedTurn = await Turn.findOne({
        gameId: game._id,
        contentType: 'zero-point',
      });
      if (existedTurn) {
        if (existedTurn.x !== 0 || existedTurn.y !== 0) {
          console.log(
            `В игре ${game._id} некорректные координаты: ${existedTurn.x} ${existedTurn.y}`
          );
        }
      } else {
        console.log(`В игре ${game._id} отсутствует zero point`);
      }
    } catch (err) {
      console.log({ err });
    }
  }
  process.exit(0);
};

checkZeroPointsInAllGames();

// const tmp = async () => {
//   const game = await Game.findOne({
//     name: 'Тестовая игра 1',
//   });
//   try {
//     const codes = [];
//     for (let code of game.codes) {
//       codes.push({
//         ...code.toObject(),
//         viewportPointX: 500,
//         viewportPointY: 500,
//       });
//     }
//     game.codes = codes;
//     game.markModified('codes');
//     await game.save();
//   } catch (err) {
//     console.log({ err });
//   }

//   process.exit(0);
// };
// tmp();
