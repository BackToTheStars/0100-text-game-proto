const GameClass = require("../models/GameClass");

async function saveGameClass(req, res) {
  const { id, gameClass, addNewSubclass, toDelete } = req.body; // деструктуризатор
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
      if (toDelete) {
        //const err = await GameClass.findByIdAndDelete(id);
        try {
          await it.delete();
          res.status(200);
        } catch (err) {
          console.log(err);
          res.status(500);
        }
        res.send();
      } else {
        let flag = false;
        if (addNewSubclass) {
          if (!(it.subClasses)) {
            it.subClasses = [addNewSubclass];
            flag = true;
          } else {
            it.subClasses.push(addNewSubclass);
            flag = true;
          }
        }
        if (gameClass) {
          it.gameClass = gameClass;
          flag = true;
        }
        if (flag) {
          it.save();
          res.status(201);
        } else {
          res.status(400);
        }
        res.send();
      }
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
};

async function getGameClasses(req, res) {
  const gameClasses = await GameClass.find();
  res.json(gameClasses);
};

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
  saveGameClass,
  getGameClasses,
  gameClassAddSubclass,
};









