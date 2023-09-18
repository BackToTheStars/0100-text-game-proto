const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../../.env'),
});

require('../../../models/db');
const TurnOld = require('../../../models/Turn');
const Game = require('../../../models/Game');
const Turn = require('../models/Turn');
const { toNewFields } = require('./utils');

const gameId = '60ede0ba8807640017d57f97';

const start = async () => {
  const oldTurns = await TurnOld.find({ gameId });

  for (let oldTurn of oldTurns) {
    await Turn.findByIdAndRemove(oldTurn._id);
    const body = toNewFields(oldTurn);
    await Turn.create(body);
  }
  const game = await Game.findById(gameId);
  game.newTurnsCount = oldTurns.length - 1;
  await game.save();
  process.exit();
};

start();
