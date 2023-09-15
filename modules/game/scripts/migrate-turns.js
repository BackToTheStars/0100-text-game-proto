const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../../.env'),
});

require('../../../models/db');
const TurnOld = require('../../../models/Turn');
const Turn = require('../models/Turn');
const { toNewFields } = require('./utils');

const hardCodeId = '60ede0ba8807640017d57f97';

const start = async () => {
  const oldTurns = await TurnOld.find({ gameId: hardCodeId });

  for (let oldTurn of oldTurns) {
    await Turn.findByIdAndRemove(oldTurn._id);
    const body = toNewFields(oldTurn);
    await Turn.create(body);
  }
  process.exit();
};

start();
