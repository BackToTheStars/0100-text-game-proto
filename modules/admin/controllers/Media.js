const { default: axios } = require('axios');
const { STATIC_MEDIA_URL } = require('../../../config/url');
const { mediaRequestError } = require('../../game/services/mediaRelocate');
const { getToken } = require('../../game/services/game');

// media проверяет на этом роуте только операцию, hash не используется —
// передаём константу-метку, чтобы payload не был безымянным в логах media.
const STATS_HASH = 'admin-stats';
const STATS_OPERATION = 'stats';
const STATS_TOKEN_TTL = 5 * 60 * 1000;
const STATS_TIMEOUT = 5000;

// Чистый проброс ответа media: тело не разбираем и не пересобираем,
// иначе сервер завяжется на его форму. Кэш — на стороне media.
const getStats = async (req, res, next) => {
  try {
    const tokenStaticServer = getToken(
      process.env.JWT_SECRET_STATIC,
      STATS_OPERATION,
      new Date().getTime() + STATS_TOKEN_TTL,
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

module.exports = {
  getStats,
};
