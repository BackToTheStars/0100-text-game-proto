
const Game = require("../models/Game");

const getItem = async (req, res) => {
  let game = await Game.findOne();
  // @fixme
  if (!game) {
      game = new Game({
          name: "Dev"
      })
      await game.save();
  }
  res.json({
    item: game
  })
}

const createRedLogicLine = async (req, res) => {
    const { sourceTurnId, sourceMarker, targetTurnId, targetMarker } = req.body;
    const game = await Game.findOne();
    game.redLogicLines = [
      { sourceTurnId, sourceMarker, targetTurnId, targetMarker },
      ...game.redLogicLines
    ];
    await game.save();
    res.json({ item: game.redLogicLines[0] })
}

const updateRedLogicLines = async (req, res) => {
    const { redLogicLines } = req.body;
    // console.log(redLogicLines);
    const game = await Game.findOne();
    // @fixme
    // if (!game) {
    //     game = new Game({
    //         name: "Dev"
    //     })
    //     await game.save();
    // }
    game.redLogicLines = redLogicLines;
    await game.save();
    res.json({ item: game });    // нейтральное название "item" (payload)
}

module.exports = {
    getItem,
    updateRedLogicLines,
    createRedLogicLine
};











