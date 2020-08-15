const Turn = require("../models/Turn");

const saveTurn = async (req, res) => {
  const {turn} = req.body; // деструктуризатор
  const turnModel = new Turn(turn);
  await turnModel.save();
  res.json(turnModel);
};

const getTurns = async (req, res) => {
  const turns = await Turn.find();
  res.json(turns);
};

module.exports = {
  saveTurn,
  getTurns,
};
