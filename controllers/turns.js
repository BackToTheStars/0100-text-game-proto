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

const updateCoordinates = async (req, res) => {
  const {turns = []} = req.body;
  const items = [];
  for (let turn of turns) {
    const {id, x, y} = turn;
    const turnModel = await Turn.findById(id);
    turnModel.x = x;
    turnModel.y = y;
    await turnModel.save();
    items.push(turnModel)
  }
  ;
  res.json({
    success: true,
    items
  });
}

module.exports = {
  saveTurn,
  getTurns,
  updateCoordinates
};
