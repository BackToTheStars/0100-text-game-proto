const Turn = require('../models/Turn');
const Game = require('../models/Game');
const Line = require('../models/Line');

const getTurnsGeometry = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const criteria = {
      gameId,
      contentType: { $ne: 'zero-point' }, // @todo: remove after zero point deleting
    };
    const turns = await Turn.find(criteria, {
      _id: true,
      x: true,
      y: true,
      width: true,
      height: true,
      contentType: true,
    });
    res.json({
      items: turns.map(({ _id, x, y, width, height, contentType }) => ({
        _id,
        contentType,
        position: {
          x,
          y,
        },
        size: {
          width,
          height,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
};

const getTurnsByIds = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const { ids } = req.query;
    const criteria = {
      gameId,
    };
    if (ids) {
      criteria._id = { $in: ids.split(',') };
    }
    const turns = await Turn.find(criteria, {
      x: false,
      y: false,
      width: false,
      height: false,
    });
    res.json({
      items: turns,
    });
  } catch (err) {
    next(err);
  }
};

async function updateTurn(req, res, next) {
  try {
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
    res.json({
      item: turnModel,
    }); // new true говорит отдать новую модель, а не старую
    const game = await Game.findById(gameId);
    await game.timeOfGameUpdate();
  } catch (error) {
    next(error);
  }
}

async function deleteTurn(req, res, next) {
  try {
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
    const game = await Game.findById(gameId);
    await game.timeOfGameUpdate();
  } catch (error) {
    next(error);
  }
}
async function createTurn(req, res, next) {
  // бусы на нитке - функции в Node все работают с req res
  try {
    const { gameId } = req.gameInfo;
    let turn = req.body; // деструктуризатор
    delete turn._id;
    const turnModel = new Turn({
      ...turn,
      gameId,
    });
    await turnModel.save();
    res.json({
      // json, render, next - один из трёх завершает обработку
      item: turnModel,
    });
    // Game.updateScreenshotTime(gameId);
    const game = await Game.findById(gameId);
    await game.timeOfGameUpdate();
  } catch (error) {
    next(error);
  }
}

async function updateCoordinates(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { turns = [] } = req.body;
    const items = [];
    for (let turn of turns) {
      const {
        _id,
        x,
        y,
        height,
        // compressed,
        // compressedHeight,
        // uncompressedHeight,
        width,
        scrollPosition,
      } = turn;

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
      turnModel.scrollPosition = scrollPosition;
      // turnModel.compressed = !!compressed;
      // if (!!compressedHeight) {
      //   turnModel.compressedHeight = compressedHeight;
      // }
      // if (!!uncompressedHeight) {
      //   turnModel.uncompressedHeight = uncompressedHeight;
      // }
      turnModel.save();

      items.push({
        _id: turnModel._id,
      });
    }
    res.json({
      success: true,
      items,
    });
  } catch (error) {
    next(error);
  }
}

async function updateScrollPositions(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { turns = [] } = req.body;
    const items = [];
    for (let turn of turns) {
      const { turnId, widgetId, scrollPosition } = turn;
      const turnModel = await Turn.findOne({ _id: turnId, gameId });
      turnModel.scrollPosition = scrollPosition;
      turnModel.save();
      items.push({
        _id: turnModel._id,
      });
    }
    res.json({
      success: true,
      items,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTurnsGeometry,
  getTurnsByIds,
  createTurn,
  updateCoordinates,
  updateScrollPositions,
  updateTurn,
  deleteTurn,
};
