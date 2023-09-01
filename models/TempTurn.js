const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId },
    contentType: { type: String },
    position: { x: Number, y: Number },
    size: { width: Number, height: Number },
    colors: { background: String, font: String },
    widgets: [
      {
        _id: false,
        type: {
          type: String,
        },
        id: String,
        show: Boolean,

        text: String,
        sources: [{ url: String, date: String, show: Boolean }],
        url: String,
        date: String,
        inserts: [Schema.Types.Mixed],
      },
    ],
    quotes: [Schema.Types.Mixed],
    widgetShownIds: [String],
  },
  { timestamps: true }
);

const example = {
  colors: {
    background: null,
    font: null,
  },
  position: {
    x: 560,
    y: 166,
  },
  size: {
    width: 800,
    height: 600,
  },
  widgets: [
    {
      type: 'header',
      id: 'h_1',
      show: true,
      text: 'Заголовок',
      sources: [
        {
          url: 'https://ya.ru',
          date: '2023-09-05',
          show: true,
        },
      ],
    },
    {
      type: 'picture',
      id: 'i_1',
      url: 'https://static.braindance.space/static/images/2023/09/01/llzzowet.jpeg',
      show: true,
    },
    {
      type: 'paragraph',
      id: 'p_1',
      inserts: [
        {
          insert: 'Текст Параграфа\n',
        },
      ],
      show: true,
    },
    {
      type: 'source',
      id: 's_1',
      show: false,
      url: 'https://google.com',
      date: '2023-08-27',
    },
  ],
  contentType: 'picture',
  gameId: '601037b9b4eaf93984ef1999',
  quotes: [],
  widgetShownIds: ['h_1', 'i_1', 'p_1', 's_1'],
};

module.exports = mongoose.model('TempTurn', schema, 'temp_turns');
