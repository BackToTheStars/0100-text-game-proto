const { ROLES } = require('../../../config/game/user');
const { resolveGameAccess } = require('../services/access');

// Сама проверка «хеш + game-token» (тексты и коды 404 / 409 / 401, истёкший токен
// как посетитель) — в services/access.js: её же зовёт сокет присутствия.
const gameMiddleware = async (req, res, next) => {
  try {
    const { hash } = req.query; // после request?...
    const gameToken = req.headers['game-token'];
    req.gameInfo = await resolveGameAccess({ hash, token: gameToken });
    next(); // пропускаем в следующий слой
  } catch (err) {
    next(err);
  }
};

const rulesEndpoint = (ruleName) => async (req, res, next) => {
  if (ROLES[req.gameInfo.role].rules.indexOf(ruleName) !== -1) {
    // если он там есть
    return next();
  }

  const error = new Error('Недостаточно прав доступа.');
  error.statusCode = 403;
  return next(error);
};

module.exports = {
  gameMiddleware,
  rulesEndpoint,
};
