const GameClass = require('../models/GameClass');
const bunyan = require('bunyan');
const log = bunyan.createLogger({
  name: 'gameClassesController',
  level: 'debug',
});

// @todo: разделить на создание класса и обновление класса (в том числе добавление субкласса)
const createGameClass = async (req, res, next) => {
  try {
    const { gameId, nickname } = req.gameInfo;
    const { id, title, name, parentId } = req.body;
    const item = new GameClass({
      gameId,
      id,
      title,
      name,
      parentId,
      author: nickname,
    });
    await item.save();
    res.json({
      item,
    });
  } catch (error) {
    next(error);
  }
};

const updateGameClass = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const { id } = req.params;
    delete req.body.id;
    const item = await GameClass.findOneAndUpdate({ id, gameId }, req.body, {
      new: true,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
};

async function deleteGameClass(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { id } = req.params;
    const item = await GameClass.findOne({ id, gameId });
    if (item) {
      await item.delete();
    }
    res.json({
      item,
    });
  } catch (e) {
    next(e);
  }
}

const getGameClass = async (req, res) => {
  const { gameId } = req.gameInfo;
  const { id } = req.params;
  const gameClass = await GameClass.findById({ _id: id, gameId });
  // здесь может быть проверка, есть ли у пользователя доступ к игре
  res.json({
    item: gameClass,
  });
};

const getGameClasses = async (req, res) => {
  const { gameId } = req.gameInfo;
  const gameClasses = await GameClass.find({ gameId });
  res.json({
    items: gameClasses,
  });
};

async function gameClassAddSubclass(req, res) {
  try {
    const { gameId } = req.gameInfo;
    // console.log(`${JSON.stringify(req.body)}`);
    const { className, subClass } = req.body;
    const gameClassModel = await GameClass.find({
      gameClass: className,
      gameId,
    });
    // console.log(`${JSON.stringify(gameClassModel)}`);
    if (!gameClassModel.length) {
      console.log(`className: ${className} was not found in db`);
    } else if (gameClassModel.length == 1) {
      if (gameClassModel[0].subClasses) {
        console.log(
          `PUSH: gameClassModel[0].subClasses: ${JSON.stringify(
            gameClassModel[0].subClasses
          )}`
        );
        gameClassModel[0].subClasses.push(subClass);
        //gameClassModel[0].update({subClasses: gameClassModel[0].subClasses});
      } else {
        console.log(
          `NEW: gameClassModel[0].subClasses: ${JSON.stringify(
            gameClassModel[0].subClasses
          )}`
        );
        gameClassModel[0].subClasses = [subClass];
      }
      await gameClassModel[0].save();
    } else {
      console.log(`className: ${className} is not unique`);
    }
    res.json(gameClassModel);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createGameClass,
  updateGameClass,
  getGameClass,
  getGameClasses,
  gameClassAddSubclass,
  deleteGameClass,
};
