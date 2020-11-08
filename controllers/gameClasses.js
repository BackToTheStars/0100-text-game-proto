const GameClass = require("../models/GameClass");

async function saveGameClass (req, res) {
  const {id, gameClass, subClasses} = req.body; // деструктуризатор
  console.log(`saveGameClass: ${JSON.stringify(req.body)}`);
  const gameClassModel = new GameClass({gameClass, subClasses});
  await gameClassModel.save();
  res.json(gameClassModel);
};

async function getGameClasses (req, res) {
  const gameClasses = await GameClass.find();
  res.json(gameClasses);
};

async function gameClassAddSubclass (req, res) {
  console.log(`${JSON.stringify(req.body)}`);
  const {className, subClass} = req.body;
  const gameClassModel = await GameClass.find({gameClass: className});
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









