const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QUOTE_TYPE_TEXT = 'text';

const schema = new Schema(
  {
    header: {
      trim: true,
      type: String,
    },
    date: {
      type: Date,
    },
    sourceUrl: {
      type: String,
    },
    paragraph: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    scrollPosition: {
      type: Number,
      required: false, // temp bug
    },
    contentType: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    videoUrl: {
      type: String,
      required: false,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      // required: true,
    },
    quotes: [
      {
        id: String,
        type: {
          type: String,
          default: QUOTE_TYPE_TEXT,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Turn', schema, 'turns');
