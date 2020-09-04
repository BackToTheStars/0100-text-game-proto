const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config.json');

const schema = new Schema({
  id: {
    type: String,
    required: true,
  },
  gameName: {
    type: String,
    required: true
  },
  startingFieldX: {
    type: Number,
    required: true
  },
  startingFieldY: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Game', schema, config.mongo.collections.games);


