const Turn = require('../models/Turn');
const Game = require('../models/Game');
const Line = require('../models/Line');
const { requireCsvString } = require('../../core/services/queryParams');
const { getError } = require('../../core/services/errors');
const { GEOMETRY_FIELDS, toGeometryItem } = require('../services/turnsGeometry');
const { applyRowOps } = require('../services/rows');

const ROWS_WRITE_ATTEMPTS = 3;

const getTurnsGeometry = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const criteria = {
      gameId,
      contentType: { $ne: 'zero-point' }, // @todo: remove after zero point deleting
    };
    const turns = await Turn.find(criteria, GEOMETRY_FIELDS);
    res.json({
      items: turns.map(toGeometryItem),
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
      criteria._id = { $in: requireCsvString(ids, 'ids').split(',') };
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

// Ряды хода перевода: операции применяются к свежим рядам, запись идёт с
// фильтром по прочитанной версии; промах — перечитать и повторить.
async function updateTurnRows(req, res, next) {
  try {
    const { id } = req.params;
    const { gameId } = req.gameInfo;
    const ops = req.body;
    for (let attempt = 0; attempt < ROWS_WRITE_ATTEMPTS; attempt += 1) {
      const turn = await Turn.findOne(
        { _id: id, gameId },
        { rows: true, rowsVersion: true }
      ).lean();
      if (!turn) {
        return next(getError('Turn not found', 404));
      }
      const rows = applyRowOps(turn.rows, ops);
      // У хода, созданного до поля, версии нет: null в фильтре находит и её.
      const rowsVersion = turn.rowsVersion === undefined ? null : turn.rowsVersion;
      const written = await Turn.findOneAndUpdate(
        { _id: id, gameId, rowsVersion },
        { $set: { rows }, $inc: { rowsVersion: 1 } },
        { new: true, projection: { rowsVersion: true } }
      );
      if (written) {
        res.json({
          success: true,
          rowsVersion: written.rowsVersion,
        });
        const game = await Game.findById(gameId);
        await game.timeOfGameUpdate();
        return;
      }
    }
    next(
      getError(
        'The rows of this turn were changed by someone else, try again',
        409,
        'rows-changed'
      )
    );
  } catch (error) {
    next(error);
  }
}

async function deleteTurn(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { id } = req.params;
    const turnModel = await Turn.findOneAndDelete({
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

const bulkUpdateTurns = async (gameId, updates) => {
  const operations = updates
    .filter(({ _id, $set }) => !!_id && Object.keys($set).length > 0)
    .map(({ _id, $set }) => ({
      updateOne: {
        filter: { _id, gameId },
        update: { $set },
      },
    }));

  if (!operations.length) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  return Turn.bulkWrite(operations, { ordered: false });
};

const setIfNumber = ($set, key, value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    $set[key] = value;
  }
};

async function updateCoordinates(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { turns = [] } = req.body;

    const updates = turns.map((turn) => {
      const { _id, x, y, height, width, scrollPosition, splitHeight } = turn;
      const $set = {};
      setIfNumber($set, 'x', x);
      setIfNumber($set, 'y', y);
      setIfNumber($set, 'height', height);
      setIfNumber($set, 'width', width);
      // клиент шлёт сюда только геометрию (см. saveField), а позиция скролла
      // приходит отдельным запросом /turns/scroll-positions — присваивать
      // undefined нельзя, иначе сохранённый скролл стирается
      setIfNumber($set, 'scrollPosition', scrollPosition);
      setIfNumber($set, 'splitHeight', splitHeight);
      return { _id, $set };
    });

    const result = await bulkUpdateTurns(gameId, updates);

    res.json({
      success: true,
      items: updates.map(({ _id }) => ({ _id })),
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
}

async function updateScrollPositions(req, res, next) {
  try {
    const { gameId } = req.gameInfo;
    const { turns = [] } = req.body;

    const updates = turns.map((turn) => {
      const { turnId, scrollPosition } = turn;
      const $set = {};
      setIfNumber($set, 'scrollPosition', scrollPosition);
      return { _id: turnId, $set };
    });

    const result = await bulkUpdateTurns(gameId, updates);

    res.json({
      success: true,
      items: updates.map(({ _id }) => ({ _id })),
      matched: result.matchedCount,
      modified: result.modifiedCount,
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
  updateTurnRows,
  deleteTurn,
};
