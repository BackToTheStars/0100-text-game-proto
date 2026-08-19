const {
  AVAILABLE_TEMPLATES,
  TEMPLATE_PICTURE,
  TEMPLATE_ZERO_POINT,
} = require('../../../../config/turn');
const Turn = require('../../../game/models/Turn');
const Game = require('../../../game/models/Game');

// Ходы, чей contentType не входит в enum схемы (`AVAILABLE_TEMPLATES`).
// Такие документы остались от старых версий редактора: любой `doc.save()` по ним
// падает с ValidationError, потому что mongoose валидирует документ целиком, а не
// изменённые поля. На практике это ломало Save Field: пакетная запись геометрии
// натыкалась на такой ход и роняла сохранение всей игры.
//
// `zero-point` намеренно вне enum (служебный тип), чистится отдельной командой
// SCRIPT_GAME_COMMON / removeZeroPoints — сюда не попадает.
const LEGACY_CRITERIA = {
  contentType: { $nin: [...AVAILABLE_TEMPLATES, TEMPLATE_ZERO_POINT] },
};

const findLegacyTurns = () =>
  Turn.find(LEGACY_CRITERIA, {
    contentType: true,
    header: true,
    gameId: true,
  }).lean();

const check = async () => {
  const turns = await findLegacyTurns();

  if (!turns.length) {
    return [true, 'Ходов с недопустимым contentType не найдено'];
  }

  const gameIds = [...new Set(turns.map((turn) => String(turn.gameId)))];
  const games = await Game.find({ _id: { $in: gameIds } }, { name: true }).lean();
  const gameNames = games.reduce((a, game) => {
    a[String(game._id)] = game.name;
    return a;
  }, {});

  const byType = turns.reduce((a, turn) => {
    a[turn.contentType] = (a[turn.contentType] || 0) + 1;
    return a;
  }, {});

  return [
    true,
    [
      `Найдено ходов: ${turns.length}`,
      `Типы: ${Object.entries(byType)
        .map(([type, count]) => `${type} — ${count}`)
        .join(', ')}`,
      `Допустимые типы: ${AVAILABLE_TEMPLATES.join(', ')}`,
      `Запуск заменит contentType на "${TEMPLATE_PICTURE}"`,
      ...turns.map(
        (turn) =>
          `${turn.contentType} | ${turn._id} | игра ${
            gameNames[String(turn.gameId)] || turn.gameId
          } | ${turn.header || '(без заголовка)'}`
      ),
    ],
  ];
};

const run = async () => {
  const turns = await findLegacyTurns();

  if (!turns.length) {
    return [true, 'Ходов с недопустимым contentType не найдено, менять нечего'];
  }

  // updateMany, а не save(): документ и так не проходит валидацию целиком,
  // а $set валидирует только contentType.
  const result = await Turn.updateMany(LEGACY_CRITERIA, {
    $set: { contentType: TEMPLATE_PICTURE },
  });

  return [
    true,
    [
      `Изменено ходов: ${result.modifiedCount}`,
      ...turns.map(
        (turn) =>
          `${turn.contentType} → ${TEMPLATE_PICTURE} | ${turn._id} | ${
            turn.header || '(без заголовка)'
          }`
      ),
    ],
  ];
};

module.exports = {
  check,
  run,
};
