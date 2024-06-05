const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Turn = require('./Turn');

const roleSchema = new Schema({
  role: {
    type: Number,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  viewportPointX: {
    type: Number,
    default: 0,
    required: false,
  },
  viewportPointY: {
    type: Number,
    default: 0,
    required: false,
  },
});

const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    codes: {
      type: [roleSchema],
      default: [],
    },
    public: {
      type: Boolean,
      default: true,
    },
    turnsCount: {
      type: Number,
      default: 0,
    },
    newTurnsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

schema.methods.timeOfGameUpdate = async function () {
  // this.timeOfGameUpdate = new Date();
  this.turnsCount = await Turn.countDocuments({ gameId: this._id });
  // console.log({ count: this.turnsCount, id: this._id });
  await this.save();
};

module.exports = mongoose.model('Game', schema, 'games');
