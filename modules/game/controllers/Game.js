const Game = require('../models/Game');
const GameClass = require('../models/GameClass');
const Turn = require('../models/Turn');

const Line = require('../models/Line');
const {
  hashFunc,
  clearGamesCache,
  getHashByGame,
} = require('../services/security');

const {
  ROLE_GAME_OWNER,
  ROLE_GAME_VISITOR,
} = require('../../../config/game/user');
const { createGameSnapshot } = require('../../backups/services/snapshots');

const createGame = async (req, res, next) => {
  try {
    const { public, name } = req.body;

    const game = new Game({
      public,
      name,
    });

    clearGamesCache();
    await game.save();

    if (game.accessLevel === 'link') {
      game.codes.push({
        role: ROLE_GAME_VISITOR,
        hash: hashFunc(game._id),
      });
    }

    const code = {
      role: ROLE_GAME_OWNER, // @todo: check if need to use role hash
      hash: hashFunc(game._id, process.env.GAME_ID_HASH_LENGTH),
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
    await Game.findByIdAndDelete(gameId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

const getGame = async (req, res) => {
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
