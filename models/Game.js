const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const redLogicLine = new Schema({
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
});

const roleSchema = new Schema({
  role: {
    type: Number,
    required: true,
  },
  hash: {
    type: String,
    required: true,
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
    redLogicLines: {
      type: [redLogicLine],
      default: [],
    },
    public: {
      type: Boolean,
      default: true,
    },
    lastScreenshotTime: {
      // последний из сделанных на текущий момент
      type: Date,
      default: Date.now,
    },
    dueScreenshotTime: {
      // актуальный скриншот
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

schema.statics = {
  updateScreenshotTime: async function (gameId) {
    let game;
    try {
      game = await this.findOneAndUpdate(
        {
          _id: gameId,
        },
        {
          dueScreenshotTime: new Date(),
        },
        { new: true } // третий аргумент, вернёт то, что сделал в базе - вернёт Game
      );
      return game;
    } catch (err) {
      console.log({ err });
    }
  },
};
module.exports = mongoose.model('Game', schema, 'games');
