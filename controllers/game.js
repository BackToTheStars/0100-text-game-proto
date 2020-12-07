
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

const deleteRedLogicLines = async (req, res) => {
  const { redLogicLines } = req.body;
  // console.log(redLogicLines);
  const game = await Game.findOne();
  // @todo: O(n^2) заменить на O(n)
  const length = game.redLogicLines.length
  game.redLogicLines = game.redLogicLines.filter(line => {
    for(let redLogicLineToRemove of redLogicLines) {
      if(line._id == redLogicLineToRemove._id) {
        return false;
      }
    }
    return true
  })
  await game.save();

  res.json({
    item: game
  })
}

module.exports = {
    getItem,
    updateRedLogicLines,
    createRedLogicLine,
    deleteRedLogicLines
};











