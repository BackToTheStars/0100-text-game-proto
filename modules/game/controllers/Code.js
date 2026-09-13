const jwt = require('jsonwebtoken');
const Game = require('../models/Game');
const { hashFunc, hashUniqueForGame, getHashByGame } = require('../services/security');
const { getError } = require('../../core/services/errors');
const { ROLE_GAME_PLAYER } = require('../../../config/game/user');
const { CODE_HASH_DEFAULT } = require('../../../config/game/code');
const {
  AUTH_VERSION,
  GAME_TOKEN_TTL_MS,
} = require('../../../config/game/auth');
const { getToken } = require('../services/game');

// Один вид токена игры на оба обработчика, его выписывающих: срок был зашит
// числом в каждом из них.
//
// gameId в теле токена — то, чем gameMiddleware сверяет, что токен выписан
// именно на игру из запроса. Без этого поля роль из токена действовала в
// любой игре, чей адрес известен.
const issueGameToken = ({ game, code, nickname, role }) => {
  const expires = Math.floor((Date.now() + GAME_TOKEN_TTL_MS) / 1000);
  const data = {
    v: AUTH_VERSION,
    gameId: '' + game._id,
    hash: getHashByGame(game),
    code,
    nickname,
    role,
  };

  return {
    success: true,
    expires,
    info: { ...data },
    token: jwt.sign({ exp: expires, data }, process.env.JWT_SECRET),
  };
};

const codeLogin = async (req, res, next) => {
  try {
    const { code, nickname } = req.body; // это после : в запросе

    if (!code || !nickname) {
      return next(getError('Invalid code or nickname', 401));
    }

    const game = await Game.findOne({
      'codes.hash': code,
    });

    if (!game) {
      return next(getError('Invalid code or nickname', 401));
    }

    const codeObj = game.codes.find((codeItem) => codeItem.hash === code);

    res.json(issueGameToken({ game, code, nickname, role: codeObj.role }));
  } catch (error) {
    next(error);
  }
};

// Токен здесь живой (gameMiddlewareLiveToken), поэтому роль и код — из его
// полезной нагрузки: поиск кода по роли отдавал первый код этой роли в игре.
const refreshCode = async (req, res, next) => {
  try {
    const { gameId, role, code } = req.gameInfo;
    const game = await Game.findById(gameId);
    if (!game) {
      return next(getError('Игра не найдена', 404, 'game-not-found'));
    }
    const nickname = req.body.nickname || req.gameInfo.nickname;

    res.json(issueGameToken({ game, code, nickname, role }));
  } catch (error) {
    next(error);
  }
}

const addCode = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const { role = ROLE_GAME_PLAYER } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return next(getError('Game not found', 404));
    }

    const extraLength = game.codeHashLength || CODE_HASH_DEFAULT;
    const code = {
      role,
      hash: hashUniqueForGame(game, extraLength),
    };

    game.codes.push(code);
    await game.save();

    res.json({
      item: code,
      codes: game.codes,
    });
  } catch (e) {
    next(e);
  }
};

// Белый список операций media, которые клиент вправе запросить через эту ручку.
// Всё остальное (list / stats / youtube / delete / download_and_save) сервер
// подписывает сам — боту, relocate и админскому прокси эта ручка не нужна.
// Без списка любой игрок любой игры выписывал себе токен на административную
// операцию media и шёл в media напрямую.
const CLIENT_ACTIONS = ['upload'];

const getStaticToken = async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!CLIENT_ACTIONS.includes(action)) {
      return next(
        getError(`Invalid action. Allowed: ${CLIENT_ACTIONS.join(', ')}`, 400)
      );
    }

    const { gameId } = req.gameInfo;

    const token = getToken(
      process.env.JWT_SECRET_STATIC,
      action,
      new Date().getTime() + 5 * 60 * 1000,
      hashFunc(gameId),
      gameId
    );

    res.json({
      item: token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  codeLogin,
  addCode,
  refreshCode,
  getStaticToken,
};
