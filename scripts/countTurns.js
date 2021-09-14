const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

require('../models/db');
const Game = require('../models/Game');

const start = async () => {
  const games = await Game.find();

  for (let game of games) {
    await game.timeOfGameUpdate();
  }

  process.exit();
};

start();
