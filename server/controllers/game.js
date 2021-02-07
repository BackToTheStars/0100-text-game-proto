const Game = require('../models/Game');
const User = require('../models/User');
const SecurityLayer = require('../services/SecurityLayer');

const createGame = async (req, res, next) => {
  try {
    const { public, name } = req.body;

    const game = new Game({
      public,
      name,
    });

    SecurityLayer.clearGamesCache();
    await game.save();

    const code = {
      role: User.roles.ROLE_EDIT, // @todo: check if need to use role hash
      hash: SecurityLayer.hashFunc(game._id, process.env.GAME_ID_HASH_LENGTH),
    };

    game.codes.push(code);
    await game.save();

    res.json({
      hash: SecurityLayer.getHashByGame(game),
      item: {
        name: game.name,
        code,
      },
    });
  } catch (e) {
    next(e);
  }
};

const getGame = async (req, res) => {
  const { gameId } = req.gameInfo;
  const game = await Game.findById(gameId, {
    _id: false,
    name: true,
    public: true,
    redLogicLines: true,
    // codes: !!req.adminId, // есть ли у него права superAdmin?
  });
  // здесь может быть проверка, есть ли у пользователя доступ к игре
  res.json({
    item: game,
  });
};

const editGame = async (req, res, next) => {
  try {
    if (!req.adminId) {
      const err = new Error('Access denied. game.js line: 41');
      err.statusCode = 403;
      return next(err);
    }
    const { gameId } = req.gameInfo;
    const { name, description, public } = req.body;
    const game = await Game.findById(gameId);
    if (name) {
      game.name = name;
    }
    if (description) {
      game.description = description;
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
        hash: SecurityLayer.getHashByGame(game),
      },
    });
  } catch (error) {
    next(error);
  }
};

async function deleteGame(req, res, next) {
  const { gameId } = req.gameInfo;
  // @todo
  const error = new Error('Функционал удаления временно недоступен');
  error.statusCode = 403;
  next(error);
}

const getGames = async (req, res, next) => {
  try {
    const fields = {
      name: true,
      public: true,
      description: true,
    };
    if (!!req.adminId) {
      // есть ли у него права superAdmin?
      fields.codes = true;
    }
    const games = await Game.find({}, fields);
    res.json({
      items: games.map((game) => ({
        ...game.toObject(),
        hash: SecurityLayer.getHashByGame(game),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// const getItem = async (req, res) => {
//     let game = await Game.findOne();
//     // @fixme
//     if (!game) {
//         game = new Game({
//             name: "Dev"
//         })
//         await game.save();
//     }
//     res.json({
//         item: game
//     })
// }

const createRedLogicLine = async (req, res) => {
  const { gameId } = req.gameInfo;
  const { sourceTurnId, sourceMarker, targetTurnId, targetMarker } = req.body;
  const game = await Game.findById(gameId);
  game.redLogicLines = [
    { sourceTurnId, sourceMarker, targetTurnId, targetMarker },
    ...game.redLogicLines,
  ];
  await game.save();
  res.json({ item: game.redLogicLines[0] });
};

const updateRedLogicLines = async (req, res) => {
  const { gameId } = req.gameInfo;
  const { redLogicLines } = req.body;
  // console.log(redLogicLines);
  const game = await Game.findById(gameId);
  // @fixme
  // if (!game) {
  //     game = new Game({
  //         name: "Dev"
  //     })
  //     await game.save();
  // }
  game.redLogicLines = redLogicLines;
  await game.save();
  res.json({ item: game }); // нейтральное название "item" (payload)
};

const deleteRedLogicLines = async (req, res) => {
  const { gameId } = req.gameInfo;
  const { redLogicLines } = req.body;
  // console.log(redLogicLines);
  const game = await Game.findById(gameId);
  // @todo: O(n^2) заменить на O(n)
  const length = game.redLogicLines.length;
  game.redLogicLines = game.redLogicLines.filter((line) => {
    for (let redLogicLineToRemove of redLogicLines) {
      if (line._id == redLogicLineToRemove._id) {
        return false;
      }
    }
    return true;
  });
  await game.save();

  res.json({
    item: game,
  });
};

const addCode = async (req, res, next) => {
  try {
    // добавляет в игру объект прав пользователя
    if (!req.adminId) {
      const err = new Error('Access denied. game.js line: 169');
      err.statusCode = 403;
      return next(err);
    }

    const { gameId } = req.gameInfo;

    const code = {
      role: User.roles.ROLE_EDIT,
      hash: SecurityLayer.hashFunc(gameId, process.env.GAME_ID_HASH_LENGTH),
    };

    console.log(`code.hash = ${code.hash}`);

    const game = await Game.findById(gameId);
    game.codes.push(code);
    await game.save();

    res.json({
      item: code,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  createGame,
  // getItem,
  updateRedLogicLines,
  createRedLogicLine,
  deleteRedLogicLines,
  getGame,
  getGames,
  editGame,
  deleteGame,
  addCode,
};
