const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Turn = require('./Turn');

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
    redLogicLines: {
      type: [redLogicLine],
      default: [],
    },
    public: {
      type: Boolean,
      default: true,
    },
    // lastScreenshotTime: {
    //   // последний из сделанных на текущий момент
    //   type: Date,
    //   default: Date.now,
    // },
    // dueScreenshotTime: {
    //   // актуальный скриншот
    //   type: Date,
    //   default: Date.now,
    // },
    turnsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

schema.statics = {
  // updateScreenshotTime: async function (gameId) {
  //   let game;
  //   try {
  //     game = await this.findOneAndUpdate(
  //       {
  //         _id: gameId,
  //       },
  //       {
  //         dueScreenshotTime: new Date(),
  //       },
  //       { new: true } // третий аргумент, вернёт то, что сделал в базе - вернёт Game
  //     );
  //     return game;
  //   } catch (err) {
  //     console.log({ err });
  //   }
  // },
  addZeroPointTurn: async function (gameId) {
    const existedTurn = await Turn.findOne({
      gameId,
      contentType: 'zero-point',
    });
    if (existedTurn) {
      console.log('Zero Point already exists');
    } else {
      const newTurn = new Turn({
        header: 'zero-point',
        gameId,
        contentType: 'zero-point',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        paragraph: '',
      });
      await newTurn.save();
    }
  },

  adjustZeroPointTurnToZeroZero: async function (gameId) {
    const existedTurn = await Turn.findOne({
      gameId,
      contentType: 'zero-point',
    });
    if (existedTurn) {
      existedTurn.x = 0;
      existedTurn.y = 0;
      await existedTurn.save();
    }
  },
};

schema.methods.timeOfGameUpdate = async function () {
  // this.timeOfGameUpdate = new Date();
  this.turnsCount = await Turn.countDocuments({ gameId: this._id });
  // console.log({ count: this.turnsCount, id: this._id });
  await this.save();
};

module.exports = mongoose.model('Game', schema, 'games');
