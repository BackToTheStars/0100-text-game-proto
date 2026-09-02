const jwt = require('jsonwebtoken');
const { ROLES, ROLE_GAME_VISITOR } = require('../../../config/game/user');
const { getInfo } = require('../services/security');
const { getError } = require('../../core/services/errors');

const gameMiddleware = async (req, res, next) => {
  try {
    const { hash } = req.query; // после request?...
    const gameToken = req.headers['game-token'];
    const { gameId, role, ambiguous } = await getInfo(hash);
    if (ambiguous) {
      // Этот адрес занят больше чем одной игрой. Раньше сервер молча отдавал
      // старшую из них — так запрос к одной игре уходил в другую.
      return next(getError('Хеш игры неоднозначен', 409));
    }
    if (!gameId) {
      // @todo: вынести в отдельный тип ошибок
      const error = new Error('Игра не найдена');
      error.statusCode = 404;
      return next(error);
    }

    if (gameToken) {
      jwt.verify(gameToken, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
        if (!err) {
          // Роль берётся из токена, а игра — из адреса в запросе. Пока токен
          // не говорил, для какой игры он выписан, владелец собственной игры
          // был владельцем любой чужой, чей адрес знает (а адреса публичных
          // игр видны в лобби). Отвечаем 401, а не 403: на 401 клиент снимает
          // сохранённый доступ и ведёт в диалог входа, на 403 — показал бы
          // alert и оставил негодный токен в хранилище.
          const tokenGameId = decoded.data?.gameId;
          if (!tokenGameId) {
            // Токены, выписанные до появления этой проверки, игры не называют —
            // доверять им нельзя. Разовый перелогин всех после выката.
            return next(getError('Токен устарел, войдите заново', 401));
          }
          if ('' + tokenGameId !== '' + gameId) {
            return next(getError('Токен выписан на другую игру', 401));
          }
          req.gameInfo = {
            gameId,
            // code: decoded.data?.code,
            role: decoded.data.role,
            nickname: decoded.data.nickname || 'Unknown', // проверка того, что пользователь зашёл
            v: decoded.data?.v,
          };
        } else if (err.name === 'TokenExpiredError') {
          // Протухший токен — штатная ситуация: клиент обновляет его через
          // POST /codes/refresh, поэтому продолжаем как посетитель.
          req.gameInfo = { gameId, role };
        } else {
          // Подделанная подпись или битый токен раньше молча превращались
          // в посетителя — ошибка была не видна.
          return next(getError('Некорректный game-token', 401));
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
