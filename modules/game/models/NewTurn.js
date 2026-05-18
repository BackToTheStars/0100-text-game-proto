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
        sources: {
          type: [{ url: String, date: String, show: Boolean }],
          default: undefined,
        },
        url: String,
        date: String,
        inserts: {
          type: [Schema.Types.Mixed],
          default: undefined,
        },
      },
    ],
    quotes: [Schema.Types.Mixed],
    widgetsToShow: [String],
  },
  { timestamps: true }
);

const exampleNew = {
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

const exampleOld = {
  _id: { $oid: '633a47993cd2ce0018c24795' },
  dontShowHeader: false,
  paragraph: [
    { insert: 'Относительно переворота в ' },
    {
      insert: 'Буркина-Фасо',
      attributes: { background: '#8aff24', id: 1664763801 },
    },
    { insert: '. Можно отметить, что это уже ' },
    {
      insert:
        '3-я страна, которая выпадает из французской сферы неоколониального влияния',
      attributes: { background: '#ffff00', id: 1664763802 },
    },
    { insert: '. Сначала из нее выпала ' },
    { insert: 'ЦАР', attributes: { background: '#8aff24', id: 1664763803 } },
    { insert: ', затем ' },
    { insert: 'Мали', attributes: { background: '#8aff24', id: 1664763804 } },
    {
      insert:
        '. \n\nЕще в прошлом году писал, что на очереди либо Буркина-Фасо, либо ',
    },
    { insert: 'Нигер', attributes: { background: '#8aff24', id: 1664763805 } },
    {
      insert:
        ' - в обоих государствах есть предпосылки для антиколониальных военных переворотов. Буркина-Фасо не подкачало. Если новая военная хунта займет ту же позицию в отношении Франции, что и военная хунта в Мали, то это будет означать, что при Макроне Франция потеряла уже 3 зависимых страны, а сама ',
    },
    {
      insert: 'французская неоколониальная империя',
      attributes: { background: '#fdc9ff', id: 1664763806 },
    },
    {
      insert:
        ' в северо-западной Африки по факту разрушена.\n\nПри этом, стоит помнить, что для Франции критически важно удержать контроль над Нигером, потому что там находятся ',
    },
    {
      insert: 'урановые рудники',
      attributes: { background: '#fdc9ff', id: 1664763807 },
    },
    {
      insert:
        '. Поэтому, нельзя исключать, что антиколониальное движение охватит и Нигер. Должно охватить. -)\n',
    },
  ],
  x: 2856,
  y: 1056,
  backgroundColor: null,
  fontColor: null,
  pictureOnly: false,
  header: 'Переворот в Буркина-Фасо',
  imageUrl:
    'https://static.braindance.space/static/images/f97/1664763734072.jpeg',
  videoUrl: null,
  sourceUrl: 'https://t.me/boris_rozhin/65754',
  contentType: 'picture',
  quotes: [
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c24796' },
      id: 1664763801,
      text: 'Буркина-Фасо',
    },
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c24797' },
      id: 1664763802,
      text: '3-я страна, которая выпадает из французской сферы неоколониального влияния',
    },
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c24798' },
      id: 1664763803,
      text: 'ЦАР',
    },
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c24799' },
      id: 1664763804,
      text: 'Мали',
    },
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c2479a' },
      id: 1664763805,
      text: 'Нигер',
    },
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c2479b' },
      id: 1664763806,
      text: 'французская неоколониальная империя',
    },
    {
      type: 'text',
      _id: { $oid: '633a47993cd2ce0018c2479c' },
      id: 1664763807,
      text: 'урановые рудники',
    },
  ],
  height: 1070,
  width: 504,
  gameId: { $oid: '60ede0ba8807640017d57f97' },
  createdAt: { $date: '2022-10-03T02:23:21.158Z' },
  updatedAt: { $date: '2023-08-02T06:33:46.212Z' },
  __v: 0,
  compressed: false,
  uncompressedHeight: 1070,
};

module.exports = mongoose.model('TempTurn', schema, 'temp_turns');
