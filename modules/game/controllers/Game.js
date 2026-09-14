const Game = require('../models/Game');
const GameClass = require('../models/GameClass');
const Turn = require('../models/Turn');

const Line = require('../models/Line');
const {
  generateAddress,
  generateCode,
  clearGamesCache,
  withAddressRetry,
} = require('../services/security');

const {
  ROLE_GAME_OWNER,
  ROLE_GAME_VISITOR,
} = require('../../../config/game/user');
const { createGameSnapshot } = require('../../backups/services/snapshots');
const { getError } = require('../../core/services/errors');

const createGame = async (req, res, next) => {
  try {
    const { public, name } = req.body;

    const { game, code } = await withAddressRetry(async () => {
      const hash = await generateAddress();
      const code = {
        role: ROLE_GAME_OWNER,
        hash: await generateCode(),
      };
      const game = new Game({ public, name, hash });
      if (game.accessLevel === 'link') {
        game.codes.push({ role: ROLE_GAME_VISITOR, hash });
      }
      game.codes.push(code);
      await game.save();
      return { game, code };
    });
    clearGamesCache();

    res.json({
      item: {
        name: game.name,
        public: game.public,
        hash: game.hash,
        code,
      },
    });
  } catch (e) {
    next(e);
  }
};

async function deleteGame(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { withoutSnapshot = false } = req.query;

    if (!withoutSnapshot) {
      await createGameSnapshot(gameId);
    }
    await GameClass.deleteMany({ gameId });
    await Turn.deleteMany({ gameId });
    await Line.deleteMany({ gameId });
    await Game.findByIdAndDelete(gameId);
    clearGamesCache(); // иначе hash удалённой игры продолжит резолвиться из кэша
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

const getGame = async (req, res, next) => {
  try {
    const { gameId, role, nickname } = req.gameInfo;
    // console.log(req.gameInfo);
    const fields = {
      // _id: false,
      hash: true,
      name: true,
      public: true,
      description: true,
      image: true,
      codes: true, // есть ли у него права superAdmin?
    };
    const game = await Game.findById(gameId, fields);

    // hash мог зарезолвиться из устаревшего кэша на уже удалённую игру:
    // сбрасываем кэш и отвечаем 404, а не падаем на null.toObject()
    if (!game) {
      clearGamesCache();
      return next(getError('Игра не найдена', 404));
    }

    // здесь может быть проверка, есть ли у пользователя доступ к игре
    const gameObj = game.toObject();
    const roleId = role;
    if (role !== ROLE_GAME_OWNER) {
      delete gameObj.codes;
    }

    const lines = await Line.find({ gameId: gameObj._id }); // вернёт массив
    delete gameObj._id;

    res.json({
      item: {
        ...gameObj,
        lines: lines.map((line) => ({ ...line.toObject(), gameId: null })),
        auth: !!nickname,
      },
    });
  } catch (err) {
    next(err);
  }
};

const editGame = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;

    // добавляет в игру объект прав пользователя
    const { name, description, public, image } = req.body;
    const game = await Game.findById(gameId);
    if (name) {
      game.name = name;
    }
    if (description) {
      game.description = description;
    }
    if (image) {
      game.image = image;
    }
    if (typeof public !== 'undefined') {
      game.public = public;
    }
    await game.save();
    res.json({
      item: {
        name: game.name,
        _id: game._id,
        public: game.public,
        description: game.description,
        hash: game.hash,
        image: game.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGame,
  getGame,
  editGame,
  deleteGame,
};
