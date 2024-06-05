const jwt = require('jsonwebtoken');
const { ROLES, ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { getInfo } = require('../services/security');
const { AUTH_VERSION } = require('../../../config/game/auth');

const gameMiddleware = async (req, res, next) => {
  try {
    const { hash } = req.query; // после request?...
    const gameToken = req.headers['game-token'];
    const { gameId, role } = await getInfo(hash);
    if (!gameId) {
      // @todo: вынести в отдельный тип ошибок
      const error = new Error('Игра не найдена');
      error.statusCode = 404;
      return next(error);
    }

    if (gameToken) {
      jwt.verify(gameToken, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) {
          req.gameInfo = {
            gameId,
            code: decoded.data?.code,
            role: decoded.data.role,
            nickname: decoded.data.nickname || 'Unknown', // проверка того, что пользователь зашёл
            v: decoded.data?.v,
          };
        } else {
          req.gameInfo = { gameId, role };
        }
        next();
      });
    } else {
      req.gameInfo = { gameId, role: ROLE_GAME_VISITOR };
      next(); // пропускаем в следующий слой
    }
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
