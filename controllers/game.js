
const Game = require("../models/Game");

const getItem = async (req, res) => {
  const game = await Game.findOne();
  res.json({
    item: game
  })
}

const updateRedLogicLines = async (req, res) => {
    const { redLogicLines } = req.body;
    // console.log(redLogicLines);
    let game = await Game.findOne();
    if (!game) {
        game = new Game({
            name: "Dev"
        })
        await game.save();
    }
    game.redLogicLines = redLogicLines;
    await game.save();
    res.json({ item: game });    // нейтральное название "item" (payload)
}

module.exports = {
    getItem,
    updateRedLogicLines
};











