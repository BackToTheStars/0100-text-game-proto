const { default: axios } = require('axios');
const { STATIC_MEDIA_URL } = require('../../../config/url');
const { mediaRequestError } = require('../../game/services/mediaRelocate');
const { getToken } = require('../../game/services/game');

// media проверяет на этих роутах только операцию, hash не используется —
// передаём константу-метку, чтобы payload не был безымянным в логах media.
const STATS_HASH = 'admin-stats';
const STATS_OPERATION = 'stats';
const FILES_HASH = 'admin-files';
const FILES_OPERATION = 'list';
// Время жизни сервисного токена общее: токен живёт ровно на один поход в media.
const TOKEN_TTL = 5 * 60 * 1000;
const STATS_TIMEOUT = 5000;
// Список считается сверкой с GridFS и, в отличие от сводки, не кэшируется —
// запас времени больше.
const FILES_TIMEOUT = 15000;

// Чистый проброс ответа media: тело не разбираем и не пересобираем,
// иначе сервер завяжется на его форму. Кэш — на стороне media.
const getStats = async (req, res, next) => {
  try {
    const tokenStaticServer = getToken(
      process.env.JWT_SECRET_STATIC,
      STATS_OPERATION,
      new Date().getTime() + TOKEN_TTL,
      STATS_HASH
    );

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
    const tokenStaticServer = getToken(
      process.env.JWT_SECRET_STATIC,
      FILES_OPERATION,
      new Date().getTime() + TOKEN_TTL,
      FILES_HASH
    );

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

module.exports = {
  getStats,
  getFiles,
};
