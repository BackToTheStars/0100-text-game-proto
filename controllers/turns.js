const Turn = require("../models/Turn");

const updateTurn = async (req, res) =>{
  const turn = req.body;
  let id = turn._id;
  delete turn._id;
  const turnModel = await Turn.findByIdAndUpdate(turn._id, turn);   //функция ищет по ид и апдейтит
  res.json("successfully updated");
}

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
  updateTurn
};
