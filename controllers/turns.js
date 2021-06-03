const Turn = require('../models/Turn');
const Game = require('../models/Game');
const Line = require('../models/Line');
// const screenshooter = require('./screenshooter');
const bunyan = require('bunyan');
const log = bunyan.createLogger({ name: 'turns', level: 'info' });

async function updateTurn(req, res, next) {
  try {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { id } = req.params;
    const { gameId } = req.gameInfo;
    const turn = req.body;
    const turnModel = await Turn.findOneAndUpdate(
      {
        gameId,
        _id: id,
      },
      {
        ...turn,
        _id: id,
        gameId,
      },
      { new: true }
    ); //функция ищет по ид и апдейтит
    // log.debug(`Ending ... ${arguments.callee.name}`);
    res.json({
      item: turnModel,
    }); // new true говорит отдать новую модель, а не старую

    // Game.updateScreenshotTime(gameId);
  } catch (error) {
    next(error);
  }
}

async function deleteTurn(req, res, next) {
  try {
    log.debug(`Entering ... ${arguments.callee.name}`);
    const { gameId } = req.gameInfo;
    const { id } = req.params;
    const turnModel = await Turn.findOneAndRemove({
      _id: id,
      gameId,
    }); //функция ищет по ид и удаляет
    const linesToDelete = await Line.deleteMany({
      $or: [{ sourceTurnId: turnModel._id }, { targetTurnId: turnModel._id }],
    });
    res.json({
      item: turnModel,
      lines: linesToDelete,
    }); // new true говорит отдать новую модель, а не старую
    // Game.updateScreenshotTime(gameId);
  } catch (error) {
    next(error);
  }
}
async function saveTurn(req, res, next) {
  // бусы на нитке - функции в Node все работают с req res
  try {
    const { gameId } = req.gameInfo;
    log.debug(`Entering ... ${arguments.callee.name}`);
    let turn = req.body; // деструктуризатор
    delete turn._id;
    const turnModel = new Turn({
      ...turn,
      gameId,
    });
    // @todo: пересмотреть
    if (turn.contentType === 'comment') {
      turnModel.header = 'comment';
    }
    await turnModel.save();
    res.json({
      // json, render, next - один из трёх завершает обработку
      item: turnModel,
    });
    // Game.updateScreenshotTime(gameId);
  } catch (error) {
    next(error);
  }
}

async function getTurns(req, res) {
  const { gameId } = req.gameInfo;
  // log.debug(`Entering ... ${arguments.callee.name}`);
  const turns = await Turn.find({
    gameId,
  });
  // log.debug(`Ending ... ${arguments.callee.name}`);
  res.json({
    items: turns,
  });
}

async function updateCoordinates(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const time = Date.now();
    const { turns = [] } = req.body;
    const items = [];
    for (let turn of turns) {
      const { _id, x, y, height, width, contentType, scrollPosition } = turn;

      // Turn.findOneAndUpdate({
      //     _id: id
      // }, {
      //     x, y, height, width, contentType, scrollPosition
      // })

      const turnModel = await Turn.findOne({ _id, gameId });
      turnModel.x = x;
      turnModel.y = y;
      turnModel.height = height;
      turnModel.width = width;
      turnModel.contentType = contentType; // @todo: delete
      turnModel.scrollPosition = scrollPosition;

      turnModel.save();

      items.push({
        _id: turnModel._id,
      });
    }
    // console.log((Date.now() - time) / 1000);
    res.json({
      success: true,
      items,
    });
    // Game.updateScreenshotTime(gameId);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  saveTurn,
  getTurns,
  updateCoordinates,
  updateTurn,
  deleteTurn,
};
