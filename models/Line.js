const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TYPE_DEFAULT = 'association';

const LineSchema = new Schema(
  {
    gameId: {
      type: mongoose.Types.ObjectId,
    },
    sourceTurnId: {
      type: mongoose.Types.ObjectId,
    },
    sourceMarker: {
      type: Number,
    },
    targetTurnId: {
      type: mongoose.Types.ObjectId,
    },
    targetMarker: {
      type: Number,
    },
    author: String,
    type: {
      type: String,
      default: TYPE_DEFAULT,
    },
    style: Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('RedLogicLine', LineSchema, 'lines');
