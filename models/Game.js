
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config.json');

const redLogicLine = new Schema({
  sourceTurnId: {
    type: mongoose.Types.ObjectId
  },
  sourceMarker: {
    type: Number
  },
  targetTurnId: {
    type: mongoose.Types.ObjectId
  },
  targetMarker: {
    type: Number
  },
})

const schema = new Schema({
  name: {
    type: String,
    required: true
  },
  redLogicLines: {
    type: [redLogicLine],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Game', schema, config.mongo.collections.games);
















