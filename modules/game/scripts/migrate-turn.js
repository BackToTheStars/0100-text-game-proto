const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../../.env'),
});

require('../../../models/db');
const TurnOld = require('../../../models/Turn');
const Turn = require('../models/Turn');
const { toNewFields } = require('./utils');

const hardCodeId = '633a47993cd2ce0018c24795';
// @todo: migrate WIDGET_COMPRESSED
const start = async () => {
  await Turn.findByIdAndRemove(hardCodeId);
  const oldTurn = await TurnOld.findById(hardCodeId);

  const body = toNewFields(oldTurn);
  await Turn.create(body);

  process.exit();
};

start();
