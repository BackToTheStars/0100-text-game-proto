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
    let {
      gameClass,
      addNewSubclass,
      renameSubclass,
      //   : { fromRenameSubclass = null, toRenameSubclass = null },
      subClassToDelete,
    } = req.body;

    const item = await GameClass.findOne({ _id: id, gameId });

    console.log(item);
    if (gameClass) {
      item.gameClass = gameClass.trim();
    }
    if (addNewSubclass) {
      addNewSubclass = addNewSubclass.trim();
      item.subClasses.push(addNewSubclass);
    }
    if (renameSubclass) {
      const { from, to } = renameSubclass;
      fromRenameSubclass = from.trim();
      toRenameSubclass = to.trim();
      const index = item.subClasses.indexOf(fromRenameSubclass);
      console.log({
        fromRenameSubclass,
        toRenameSubclass,
        index,
      });
      if (index !== -1) {
        const prevSubClasses = [...item.subClasses];
        prevSubClasses.splice(index, 1, toRenameSubclass);
        item.subClasses = prevSubClasses;
        // item.subClasses.splice(index, 1, toRenameSubclass);
      }
    }
    if (subClassToDelete) {
      subClassToDelete = subClassToDelete.trim();
      const index = item.subClasses.indexOf(subClassToDelete);
      if (index !== -1) {
        item.subClasses.splice(index, 1);
      }
    }

    await item.save();
    res.json({
      item,
    });
  } catch (e) {
    next(e);
  }
};

async function deleteGameClass(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { id } = req.params;
    const item = await GameClass.findOne({ _id: id, gameId });
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
