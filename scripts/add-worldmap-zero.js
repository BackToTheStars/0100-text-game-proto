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
