const GameClass = require("../models/GameClass");

const saveGameClass = async (req, res) => {
  const {id, gameClass} = req.body; // деструктуризатор
  const gameClassModel = new GameClass(gameClass);
  await gameClassModel.save();
  res.json(gameClassModel);
};

const getGameClasses = async (req, res) => {
  const gameClasses = await GameClass.find();
  res.json(gameClasses);
};

module.exports = {
  saveGameClass,
  getGameClasses,
};
