const { default: axios } = require('axios');
const { STATIC_MEDIA_URL } = require('../../../config/url');
const { getError } = require('../../core/services/errors');
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
      if (err.response) {
        // media ответила, но не 2xx — её статус пробрасываем как 502
        const mediaMessage = err.response.data && err.response.data.message;
        throw getError(
          `Медиа-сервер вернул ошибку (${err.response.status})` +
            (mediaMessage ? `: ${mediaMessage}` : ''),
          502
        );
      }
      // соединения не случилось: media лежит, таймаут, DNS.
      // message бывает пустым (AggregateError от happy-eyeballs, когда localhost
      // резолвится и в ::1, и в 127.0.0.1) — тогда причину несёт только code.
      const reason = err.message || err.code || 'причина неизвестна';
      throw getError(
        `Медиа-сервер недоступен (${STATIC_MEDIA_URL}): ${reason}`,
        503
      );
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
