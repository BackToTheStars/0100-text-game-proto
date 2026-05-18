const Line = require('../models/Line');

const createLine = async (req, res, next) => {
  try {
    const { gameId, nickname } = req.gameInfo;
    const newLines = [];
    const { lines } = req.body;
    for (let line of lines) {
      const { sourceTurnId, sourceMarker, targetTurnId, targetMarker } = line;
      newLines.push({
        gameId,
        sourceTurnId,
        sourceMarker,
        targetTurnId,
        targetMarker,
        author: nickname,
      });
    }
    const items = await Line.create(newLines);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

const deleteLines = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const ids = req.body;
    const lines = await Line.find({ gameId, _id: { $in: ids } });
    await Line.deleteMany({ gameId, _id: { $in: ids } });

    res.json({
      items: lines,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLine,
  deleteLines,
}