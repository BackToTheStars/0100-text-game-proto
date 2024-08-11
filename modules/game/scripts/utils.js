const {
  WIDGET_HEADER,
  WIDGET_PICTURE,
  WIDGET_VIDEO,
  WIDGET_AUDIO,
  WIDGET_SOURCE,
  WIDGET_PARAGRAPH,
} = require('../../../config/turn');

const toNewFields = (turn) => {
  const widgets = {
    [WIDGET_HEADER]: [
      // @todo: использовать логику getCommentHeaderColor с клиентского сайта
      // установить высоту в зависимости от наличия source
      {
        id: 'h_1',
        show: !turn.dontShowHeader,
        text: turn.header,
      },
    ],
    [WIDGET_PICTURE]: [
      {
        id: 'i_1',
        show: !!turn.imageUrl,
        url: turn.imageUrl,
        quotes: turn.quotes.filter((quote) => quote.type === 'picture'),
      },
    ],
    [WIDGET_VIDEO]: [{ id: 'v_1', show: !!turn.videoUrl, url: turn.videoUrl }],
    [WIDGET_AUDIO]: [{ id: 'a_1', show: !!turn.audioUrl, url: turn.audioUrl }],
    [WIDGET_SOURCE]: [
      {
        id: 's_1',
        show: (!!turn.sourceUrl || !!turn.date) && turn.dontShowHeader,
      },
    ],
    [WIDGET_PARAGRAPH]: [
      {
        id: 'p_1',
        show: !!turn.paragraph && turn.paragraph.length && !turn.compressed,
        inserts: turn.paragraph,
        scrollPosition: turn.scrollPosition,
        quotes: turn.quotes.filter((quote) => quote.type === 'text'),
      },
    ],
  };

  const widgetsToDB = [];

  const dWidgets = {};

  for (const type in widgets) {
    for (const widget of widgets[type]) {
      // сейчас там только нулевой элемент
      dWidgets[widget.id] = { ...widget, type };
      if (widget.show) {
        widgetsToDB.push({ ...widget, type });
      }
    }
  }

  const widgetsToShow = Object.values(dWidgets)
    .filter((widget) => widget.show)
    .map(
      (widget) => widget.id
      // ({
      //   type: widget.type,
      //   id: widget.id,
      // })
    );

  return {
    _id: turn._id,
    contentType: turn.contentType, // turn.pictureOnly
    gameId: turn.gameId,
    originalId: turn.originalId,
    date: turn.date,
    sourceUrl: turn.sourceUrl,

    colors: {
      background: turn.backgroundColor,
      font: turn.fontColor,
    },
    position: {
      x: turn.x,
      y: turn.y,
    },
    size: {
      width: turn.width,
      height: turn.height,
    },

    quotes: turn.quotes,
    // widgetsCount: 0,
    widgets: widgetsToDB,
    // dWidgets,
    widgetsToShow,
  };
};

module.exports = {
  toNewFields,
};
