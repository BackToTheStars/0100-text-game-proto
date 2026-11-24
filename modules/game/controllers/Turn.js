const Turn = require('../models/Turn');
const Game = require('../models/Game');
const Line = require('../models/Line');
const { requireCsvString } = require('../../core/services/queryParams');
const { getError } = require('../../core/services/errors');
const { GEOMETRY_FIELDS, toGeometryItem } = require('../services/turnsGeometry');
const { listTurns } = require('../services/turnNavigator');
const { applyTurnOps, changesRows } = require('../services/turnOps');
const { rowsFromMarkdown } = require('../services/mdBlocks');
const { TEMPLATE_MD } = require('../../../config/turn');

const OPS_WRITE_ATTEMPTS = 3;

// Верхнеуровневые поля обычной правки. Ряды и версия принадлежат маршруту операций.
const EDITABLE_TURN_FIELDS = new Set([
  'header', 'dontShowHeader', 'date', 'sourceUrl', 'paragraph', 'markdown', 'languages',
  'contentType', 'backgroundColor', 'fontColor', 'pictureOnly', 'quotes', 'imageUrl',
  'videoUrl', 'videoPreview', 'videoQuotes', 'audioUrl', 'audioTitle', 'audioQuotes',
  'pdfUrl', 'pdfCrop', 'x', 'y', 'z', 'width', 'height', 'scrollPosition', 'splitHeight',
  'compressed', 'compressedHeight', 'uncompressedHeight',
]);

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

const getTurnNavigatorPage = async (req, res, next) => {
  try {
    const page = await listTurns(Turn, req.gameInfo.gameId, req.query, () => res.destroyed);
    if (!res.destroyed) res.json(page);
  } catch (error) {
    next(error);
  }
};

// У статьи, разделённой миграцией, markdown хранится только ради отката: клиенту он не нужен и удвоил бы ответ.
const withoutStaleMarkdown = (turn) => {
  if (turn.contentType !== TEMPLATE_MD || !turn.rows?.length || turn.markdown === undefined) return turn;
  const { markdown, ...item } = turn.toJSON();
  return item;
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
      items: turns.map(withoutStaleMarkdown),
    });
  } catch (err) {
    next(err);
  }
};

async function updateTurn(req, res, next) {
  try {
    const { id } = req.params;
    const { gameId } = req.gameInfo;
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next(getError('Expected a turn object', 400));
    }
    // Форма передаёт _id и в теле. Ход определяется маршрутом и игрой из токена.
    const { _id, ...fields } = req.body;
    for (const key of Object.keys(fields)) {
      if (!EDITABLE_TURN_FIELDS.has(key)) return next(getError(`«${key}» is not accepted here`, 400));
    }
    const filter = { gameId, _id: id };
    // Старый клиент шлёт статью целиком: у статьи в рядах он затёр бы блоки, правленные операциями.
    if ('markdown' in fields) {
      filter.$or = [{ contentType: { $ne: TEMPLATE_MD } }, { 'rows.0': { $exists: false } }];
    }
    const turnModel = await Turn.findOneAndUpdate(
      filter,
      { $set: fields },
      { new: true, projection: { rows: false, markdown: false } }
    );
    if (!turnModel) {
      if (filter.$or && (await Turn.exists({ gameId, _id: id }))) {
        return next(getError('The article is stored in rows: «markdown» is not accepted', 400, 'article-in-rows'));
      }
      return next(getError('Turn not found', 404));
    }
    res.json({ item: turnModel });
    const game = await Game.findById(gameId);
    await game.timeOfGameUpdate();
  } catch (error) {
    next(error);
  }
}

// Операции применяются к свежему ходу, запись идёт с фильтром по прочитанной
// версии; промах — перечитать и повторить.
async function applyTurnOperations(req, res, next) {
  try {
    const { id } = req.params;
    const { gameId } = req.gameInfo;
    const { ops } = req.body || {};
    for (let attempt = 0; attempt < OPS_WRITE_ATTEMPTS; attempt += 1) {
      const turn = await Turn.findOne(
        { _id: id, gameId },
        { rows: true, opsVersion: true, contentType: true }
      ).lean();
      if (!turn) {
        return next(getError('Turn not found', 404));
      }
      const { rows, fields } = applyTurnOps(turn, ops);
      const $set = changesRows(ops) ? { ...fields, rows } : fields;
      // У хода, созданного до поля, версии нет: null в фильтре находит и его.
      const opsVersion = turn.opsVersion ?? null;
      const written = await Turn.findOneAndUpdate(
        { _id: id, gameId, opsVersion },
        { $set, $inc: { opsVersion: 1 } },
        { new: true, projection: { opsVersion: true } }
      );
      if (written) {
        res.json({
          success: true,
          version: written.opsVersion,
        });
        const game = await Game.findById(gameId);
        await game.timeOfGameUpdate();
        return;
      }
    }
    next(
      getError(
        'The turn was changed by someone else, try again',
        409,
        'turn-changed'
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
// Статья хранится блоками в рядах одной колонкой. Старый клиент, сиды и старые копии хода присылают
// markdown — он делится здесь; присланные ряды важнее, поле markdown не пишется.
function articleFields(turn) {
  const { markdown, ...rest } = turn;
  if (Array.isArray(turn.rows) && turn.rows.length) {
    if (turn.rows.some((row) => typeof row?.right === 'string' && row.right !== '')) {
      throw getError('An article has no right column', 400);
    }
    return { ...rest, rows: turn.rows.map((row) => (row && typeof row === 'object' ? { ...row, right: '' } : row)) };
  }
  return { ...rest, rows: typeof markdown === 'string' ? rowsFromMarkdown(markdown) : [] };
}

async function createTurn(req, res, next) {
  // бусы на нитке - функции в Node все работают с req res
  try {
    const { gameId } = req.gameInfo;
    let turn = req.body; // деструктуризатор
    delete turn._id;
    delete turn.opsVersion;
    if (turn.contentType === TEMPLATE_MD) {
      turn = articleFields(turn);
    }
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
      const { _id, x, y, z, height, width, scrollPosition, splitHeight } = turn;
      const $set = {};
      setIfNumber($set, 'x', x);
      setIfNumber($set, 'y', y);
      setIfNumber($set, 'height', height);
      setIfNumber($set, 'width', width);
      setIfNumber($set, 'z', z);
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
  getTurnNavigatorPage,
  getTurnsByIds,
  createTurn,
  updateCoordinates,
  updateScrollPositions,
  updateTurn,
  applyTurnOperations,
  deleteTurn,
};
