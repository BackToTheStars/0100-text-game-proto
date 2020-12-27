
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
  },
  public: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Game', schema, "games");
















