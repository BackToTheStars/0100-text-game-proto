const Game = require('../models/Game');
const GameClass = require('../models/GameClass');
const Turn = require('../models/Turn');

const Line = require('../models/Line');
const {
  hashFunc,
  hashUniqueForGame,
  clearGamesCache,
  getHashByGame,
  getInfo,
} = require('../services/security');
const {
  CODE_HASH_MIN,
  CODE_HASH_MAX,
  normalizeCodeHashLength,
} = require('../../../config/game/code');

const {
  ROLE_GAME_OWNER,
  ROLE_GAME_VISITOR,
} = require('../../../config/game/user');
const { createGameSnapshot } = require('../../backups/services/snapshots');
const { getError } = require('../../core/services/errors');

const createGame = async (req, res, next) => {
  try {
    const { public, name } = req.body;

    const codeHashLength = normalizeCodeHashLength(req.query.codeLength);
    if (codeHashLength === null) {
      return next(
        getError(
          `codeLength должен быть целым числом в диапазоне [${CODE_HASH_MIN}, ${CODE_HASH_MAX}]`,
          400
        )
      );
    }

    const game = new Game({
      public,
      name,
      codeHashLength,
    });

    clearGamesCache();
    await game.save();
    try {
      // @todo: optimization
      const hash = getHashByGame(game);
      await getInfo(hash);
    } catch (err) {
      await game.remove();
      return next(getError('Game does not created. Try again', 400));
    }

    if (game.accessLevel === 'link') {
      game.codes.push({
        role: ROLE_GAME_VISITOR,
        hash: hashFunc(game._id),
      });
    }

    const code = {
      role: ROLE_GAME_OWNER, // @todo: check if need to use role hash
      hash: hashUniqueForGame(game, game.codeHashLength),
    };

    game.codes.push(code);
    await game.save();
    // await Game.addZeroPointTurn(game._id);

    res.json({
      item: {
        name: game.name,
        public: game.public,
        hash: getHashByGame(game),
        code,
      },
    });
    clearGamesCache();
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
        hash: getHashByGame(game),
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
        hash: getHashByGame(game),
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
