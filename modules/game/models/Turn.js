const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QUOTE_TYPE_TEXT = 'text';
const QUOTE_TYPE_PICTURE = 'picture';
const QUOTE_TYPE_VIDEO = 'video';
const QUOTE_TYPE_AUDIO = 'audio';

const schema = new Schema(
  {
    header: {
      trim: true,
      type: String,
    },
    dontShowHeader: {
      type: Boolean,
      default: false,
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
    backgroundColor: {
      type: String,
      // default: '#eced9a',
    },
    fontColor: {
      type: String,
      // default: '#0a0a0a',
    },
    imageUrl: {
      type: String,
      required: false,
    },
    videoUrl: {
      type: String,
      required: false,
    },
    videoPreview: {
      type: String,
      required: false,
    },
    videoQuotes: {
      type: {
        connectedTo: String,
        duration: Number,
      },
      required: false,
      quotes: [
        {
          id: Number,
          text: String,
          active: Boolean,
          start: Number,
        },
      ],
    },
    audioUrl: {
      type: String,
      required: false,
    },
    audioQuotes: {
      type: {
        connectedTo: String,
        duration: Number,
      },
      required: false,
      quotes: [
        {
          id: Number,
          text: String,
          active: Boolean,
          start: Number,
        },
      ],
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      // required: true,
    },
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      // required: true,
    },
    pictureOnly: {
      type: Boolean,
      default: false,
    },
    quotes: [
      {
        id: Number,
        text: String,
        type: {
          type: String,
          default: QUOTE_TYPE_TEXT,
        },
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
    ],
    compressed: {
      type: Boolean,
      default: false,
    },
    compressedHeight: {
      type: Number,
    },
    uncompressedHeight: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

schema.statics = {
  QUOTE_TYPE_TEXT,
  QUOTE_TYPE_PICTURE,
};

module.exports = mongoose.model('Turn', schema, 'turns');
