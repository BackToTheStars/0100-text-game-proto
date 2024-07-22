const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Turn = require('./Turn');

const codeSchema = new Schema({
  role: {
    type: Number,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  viewportPointX: {
    // @deprecated
    type: Number,
    // default: 0,
    required: false,
  },
  viewportPointY: {
    // @deprecated
    type: Number,
    // default: 0,
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
      type: [codeSchema],
      default: [],
    },
    public: {
      type: Boolean,
      default: true,
    },
    accessLevel: {
      type: String,
      default: 'link', // 'code'
      enum: ['link', 'code'],
    },
    turnsCount: {
      type: Number,
      default: 0,
    },
    newTurnsCount: {
      type: Number,
      default: 0,
    },
    // @deprecated
    redLogicLines: mongoose.Schema.Types.Mixed,
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
