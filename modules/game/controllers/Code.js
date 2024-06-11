const jwt = require('jsonwebtoken');
const Game = require('../models/Game');
const { hashFunc, getHashByGame } = require('../services/security');
const { getError } = require('../../core/services/errors');
const { ROLE_GAME_PLAYER } = require('../../../config/game/user');
const { AUTH_VERSION } = require('../../../config/game/auth');

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
    const cookieExp = Date.now() + 7 * 24 * 3600000;

    const data = {
      v: AUTH_VERSION,
      // hash: getHashByGame(game),
      code,
      nickname,
      role: codeObj.role,
    };
    const token = jwt.sign(
      {
        exp: Math.floor(cookieExp / 1000),
        data,
      },
      process.env.JWT_SECRET
    );

    res.json({
      success: true,
      expires: Math.floor(cookieExp / 1000),
      info: {
        ...data,
        hash: getHashByGame(game)
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

const addCode = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const { role = ROLE_GAME_PLAYER } = req.body;

    const code = {
      role,
      hash: hashFunc(gameId, process.env.GAME_ID_HASH_LENGTH),
    };

    const game = await Game.findById(gameId);
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

const updateViewport = async (req, res, next) => {
  const { gameId, role } = req.gameInfo;
  const { x: viewportPointX, y: viewportPointY } = req.body;
  const roleId = role;

  const game = await Game.findById(gameId);
  for (let i = 0; i < game.codes.length; i++) {
    // @fixme: проверять код, а не роль
    if (game.codes[i].role == roleId) {
      game.codes[i].viewportPointX = viewportPointX;
      game.codes[i].viewportPointY = viewportPointY;
    }
  }
  await game.save();

  res.json({
    success: true,
    item: {
      x: viewportPointX,
      y: viewportPointY,
    },
  });
};

module.exports = {
  codeLogin,
  addCode,
  updateViewport,
};
