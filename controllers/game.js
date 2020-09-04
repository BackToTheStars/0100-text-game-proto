const Game = require("../models/GameClass");

const saveGame = async (req, res) => {
  const {id, game} = req.body; // деструктуризатор
  const gameModel = new Game(game);
  await gameModel.save();
  res.json(gameModel);
};

const getGame = async (req, res) => {
  const game = await Game.find();
  res.json(game);
};

module.exports = {
  saveGame,
  getGame,
};


