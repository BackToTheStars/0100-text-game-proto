const GameClass = require("../models/GameClass");
const bunyan = require('bunyan');
const log = bunyan.createLogger({
  name: 'gameClassesController',
  level: 'debug',
});

// @todo: разделить на создание класса и обновление класса (в том числе добавление субкласса)
const createGameClass = async (req, res, next) => {
  const {
    gameClass,
    gameId, // @todo: решить, передавать ли этот параметр в headers
  } = req.body;
  try {
    const item = new GameClass({ gameClass, gameId});
    await item.save();
    res.json({
      item
    })
  } catch (error) {
    // next(new Error("Какое-то сообщение"))
    next(error);
  }
}

async function saveGameClass(req, res) {
  const { id, gameClass, addNewSubclass, renameSubclass } = req.body; // деструктуризатор
  try {
    if (id) {
      let it;
      try {
        it = await GameClass.findById(id);
      } catch (err) {
        res.status(400);
        res.send();
        return;
      }
      let flag = false;
      if (addNewSubclass && typeof (addNewSubclass) === 'string') {
        if (!(it.subClasses)) {
          it.subClasses = [addNewSubclass.trim()];
          flag = true;
        } else {
          it.subClasses.push(addNewSubclass.trim());
          flag = true;
        }
      }
      if (gameClass && typeof (gameClass) === 'string') {
        it.gameClass = gameClass.trim();
        flag = true;
      }
      if (renameSubclass && it.subClasses) {
        //console.log('before typecheck');
        if (typeof (renameSubclass.from) === 'string' && typeof (renameSubclass.to) === 'string') {
          const from = renameSubclass.from.trim();
          const to = renameSubclass.to.trim();
          //console.log(`from: "${from}" | to: "${to}"`);
          if (from !== to) {
            const ind = it.subClasses.indexOf(from);
            //console.log(`ind: ${ind}`);
            if (ind !== -1) {
              //console.log('before splice');
              it.subClasses.splice(ind, 1, to);
              flag = true;
            }
          }
        }
      }
      if (flag) {
        await it.save();
        res.status(201).send({
          item: it
        });
      } else {
        res.status(400);
      }
      res.send();
    } else {
      console.log(`saveGameClass: ${JSON.stringify(req.body)}`);
      const gameClassModel = new GameClass({ gameClass });
      await gameClassModel.save();
      res.status(201);
      res.json(gameClassModel);
    }
  } catch (err) {
    res.status(500);
    res.send();
  }
}

async function deleteGameClass(req, res) {
  const { id, subClassToDelete } = req.body;
  if (!id || typeof (id) !== 'string' || !id.trim()) {
    res.status(400);
    res.send();
    return;
  }
  try {
    let it;
    try {
      it = await GameClass.findById(id);
    } catch (err) {
      log.debug(`id "${id}" not found`);
      res.status(400);
      res.send();
      return;
    }
    if (subClassToDelete) {
      if (typeof (subClassToDelete) !== 'string' || !subClassToDelete.trim()) {
        log.debug(`subClassToDelete bad type of empty`);
        res.status(400);
        res.send();
        return;
      }
      if (!it.subClasses) {
        log.debug(`it.subClasses is false`);
        res.status(400);
        res.send();
        return;
      }
      const ind = it.subClasses.indexOf(subClassToDelete);
      if (ind === -1) {
        log.debug(`subClassToDelete "${subClassToDelete}" not found, it.subClasses = ${JSON.stringify(it.subClasses)}`);
        res.status(400);
        res.send();
        return;
      }
      it.subClasses.splice(ind, 1);
      await it.save();
      res.status(204);
      res.send();
    } else {
      await it.delete();
      return res.status(204)
        .send({
          success: true // @todo: check it
        });
    }
  } catch (err) {
    log.warn(err);
    res.status(500);
    res.send();
  }
}

const getGameClass = async (req, res) => {
  const { id } = req.params;
  const gameClass = await GameClass.findById(id);
  // здесь может быть проверка, есть ли у пользователя доступ к игре
  res.json({
    item: gameClass
  });
}

const getGameClasses = async (req, res) => {
  const gameClasses = await GameClass.find();
  res.json({
    items: gameClasses
  });
}

async function gameClassAddSubclass(req, res) {
  console.log(`${JSON.stringify(req.body)}`);
  const { className, subClass } = req.body;
  const gameClassModel = await GameClass.find({ gameClass: className });
  console.log(`${JSON.stringify(gameClassModel)}`);
  if (!gameClassModel.length) {
    console.log(`className: ${className} was not found in db`);
  } else if (gameClassModel.length == 1) {
    if (gameClassModel[0].subClasses) {
      console.log(`PUSH: gameClassModel[0].subClasses: ${JSON.stringify(gameClassModel[0].subClasses)}`);
      gameClassModel[0].subClasses.push(subClass);
      //gameClassModel[0].update({subClasses: gameClassModel[0].subClasses});
    } else {
      console.log(`NEW: gameClassModel[0].subClasses: ${JSON.stringify(gameClassModel[0].subClasses)}`);
      gameClassModel[0].subClasses = [subClass];
    }
    await gameClassModel[0].save();
  } else {
    console.log(`className: ${className} is not unique`);
  }
  res.json(gameClassModel);
}

module.exports = {
  createGameClass,
  saveGameClass,
  getGameClass,
  getGameClasses,
  gameClassAddSubclass,
  deleteGameClass,
};









