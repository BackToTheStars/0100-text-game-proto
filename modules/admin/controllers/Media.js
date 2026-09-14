const { default: axios } = require('axios');
const { STATIC_MEDIA_URL } = require('../../../config/url');
const { mediaRequestError } = require('../../game/services/mediaRelocate');
const { getServiceToken } = require('../../game/services/game');
const botConfig = require('../../../config/bot');
const { describeBotLimits } = require('../services/botLimits');

const STATS_OPERATION = 'stats';
const FILES_OPERATION = 'list';
const LIMITS_OPERATION = 'limits';
const STATS_TIMEOUT = 5000;
// Список считается сверкой с GridFS и, в отличие от сводки, не кэшируется —
// запас времени больше.
const FILES_TIMEOUT = 15000;

// Чистый проброс ответа media: тело не разбираем и не пересобираем,
// иначе сервер завяжется на его форму. Кэш — на стороне media.
const getStats = async (req, res, next) => {
  try {
    const tokenStaticServer = getServiceToken(STATS_OPERATION);

    let resp;
    try {
      resp = await axios({
        method: 'get',
        url: STATIC_MEDIA_URL + '/stats',
        headers: {
          Authorization: 'Bearer ' + tokenStaticServer,
        },
        timeout: STATS_TIMEOUT,
      });
    } catch (err) {
      // Разбор один на все обращения к media (там же — почему 500 отдаётся как
      // 502 и почему причина недоступности берётся из message || code).
      throw mediaRequestError(err);
    }

    res.json({
      item: resp.data,
    });
  } catch (err) {
    next(err);
  }
};

// Список файлов для админской таблицы. Ни один параметр здесь
// не разбирается: фильтры, сортировку и пагинацию проверяет media
// (parseListQuery), и её 400 доезжает до клиента с текстом причины — своя
// вторая проверка только разъехалась бы с настоящей.
const getFiles = async (req, res, next) => {
  try {
    const tokenStaticServer = getServiceToken(FILES_OPERATION);

    // Query уходит транзитом той же строкой, что пришла: пересборка параметров
    // ломала бы повторяющиеся ключи (?type=images&type=videos) и молча
    // отбрасывала бы то, чего сервер о контракте media ещё не знает.
    const queryIndex = req.originalUrl.indexOf('?');
    const query =
      queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex + 1);

    let resp;
    try {
      resp = await axios({
        method: 'get',
        url: STATIC_MEDIA_URL + '/files' + (query ? '?' + query : ''),
        headers: {
          Authorization: 'Bearer ' + tokenStaticServer,
        },
        timeout: FILES_TIMEOUT,
      });
    } catch (err) {
      throw mediaRequestError(err);
    }

    // Конверт media — { items, total, page, limit } — уже совпадает с тем, что
    // ждёт клиент, поэтому отдаём тело как есть, без обёртки.
    res.json(resp.data);
  } catch (err) {
    next(err);
  }
};

// Отчёт media пробрасывается как есть, лимиты бота — из конфигурации этого процесса.
const getLimits = async (req, res, next) => {
  try {
    let resp;
    try {
      resp = await axios({
        method: 'get',
        url: STATIC_MEDIA_URL + '/limits',
        headers: {
          Authorization: 'Bearer ' + getServiceToken(LIMITS_OPERATION),
        },
        timeout: STATS_TIMEOUT,
      });
    } catch (err) {
      throw mediaRequestError(err);
    }

    res.json({
      item: {
        media: resp.data,
        bot: describeBotLimits(botConfig, process.env),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getFiles,
  getLimits,
};
