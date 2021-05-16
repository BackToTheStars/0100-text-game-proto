const Game = require('../models/Game');
const Screenshot = require('../models/Screenshot');
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
      role: User.roles.ROLE_GAME_OWNER, // @todo: check if need to use role hash
      hash: SecurityLayer.hashFunc(game._id, process.env.GAME_ID_HASH_LENGTH),
    };

    game.codes.push(code);
    await game.save();
    await Game.addZeroPointTurn(game._id);

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
  const { gameId, roles } = req.gameInfo;
  const fields = {
    // _id: false,
    hash: true,
    name: true,
    public: true,
    redLogicLines: true,
    description: true,
    image: true,
    codes: true, // есть ли у него права superAdmin?
  };
  const game = await Game.findById(gameId, fields);

  // здесь может быть проверка, есть ли у пользователя доступ к игре
  const gameObj = game.toObject();
  const roleId = roles[roles.length - 1];
  const code =
    game.codes.find((nextCode) => {
      return nextCode.role == roleId;
    }) || {};
  const { viewportPointX = 0, viewportPointY = 0 } = code;
  delete gameObj._id;
  if (roles.indexOf(User.roles.ROLE_GAME_OWNER) === -1) {
    delete gameObj.codes;
  }
  res.json({
    item: {
      ...gameObj,
      hash: SecurityLayer.getHashByGame(game),
      viewportPointX,
      viewportPointY,
    },
  });
};

const editGame = async (req, res, next) => {
  try {
    const { gameId, roles } = req.gameInfo;

    // добавляет в игру объект прав пользователя
    if (!req.adminId && roles.indexOf(User.roles.ROLE_GAME_OWNER) == -1) {
      const err = new Error('Access denied. game.js line: 68');
      err.statusCode = 403;
      return next(err);
    }

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
        hash: SecurityLayer.getHashByGame(game),
        image: game.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateViewPort = async (req, res, next) => {
  const { gameId, roles } = req.gameInfo;
  const { x: viewportPointX, y: viewportPointY } = req.body;
  const roleId = roles[roles.length - 1];

  const game = await Game.findById(gameId);
  for (let i = 0; i < game.codes.length; i++) {
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
      image: true,
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
    const { gameId, roles } = req.gameInfo;

    // добавляет в игру объект прав пользователя
    if (!req.adminId && roles.indexOf(User.roles.ROLE_GAME_OWNER) == -1) {
      const err = new Error('Access denied. game.js line: 169');
      err.statusCode = 403;
      return next(err);
    }

    const code = {
      role: User.roles.ROLE_GAME_PLAYER,
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

const getScreenshot = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const screenshot = await Screenshot.findById(gameId);

    if (screenshot && screenshot.data) {
      res.set('Content-Type', screenshot.contentType);
      res.send(screenshot.data);
    } else {
      res.status(404).send('Image not found');
    }
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
  updateViewPort,
  deleteGame,
  addCode,
  getScreenshot,
};
