const Game = require('../../../game/models/Game');
const Turn = require('../../../game/models/Turn');
const {
  relocateDocFields,
  getCurrentMediaHost,
} = require('../../../game/services/mediaRelocate');

// Явные поля со ссылками на медиа и их типы (сегмент пути media-сервиса).
const TURN_FIELDS = [
  ['imageUrl', 'images'],
  ['videoUrl', 'videos'],
  ['videoPreview', 'images'],
  ['audioUrl', 'audios'],
];
const GAME_FIELDS = [
  ['image', 'images'], // обложка самой игры
];

const resolveGame = async (gameId) => {
  if (!gameId) throw new Error('Не передан gameId');
  const game = await Game.findById(gameId);
  if (!game) throw new Error(`Игра ${gameId} не найдена`);
  return game;
};

// Сухой прогон: что и сколько уедет, без изменений и без обращений к media.
const check = async ({ gameId } = {}) => {
  try {
    const game = await resolveGame(gameId);
    const turns = await Turn.find({ gameId });

    const counts = { wouldMove: 0, deferred: 0, unknown: 0 };
    const details = [];

    const collect = (label, results) => {
      for (const r of results) {
        if (r.status === 'would-move') {
          counts.wouldMove++;
          details.push(`[move] ${label}.${r.field}: ${r.from}`);
        } else if (r.status === 'deferred') {
          counts.deferred++;
          details.push(`[deferred:${r.provider}] ${label}.${r.field}: ${r.from}`);
        } else if (r.status === 'unknown') {
          counts.unknown++;
          details.push(`[unknown] ${label}.${r.field}: ${r.from}`);
        }
      }
    };

    collect('game', (await relocateDocFields(game, GAME_FIELDS, { mutate: false })).results);
    for (const turn of turns) {
      collect(
        `turn ${turn._id}`,
        (await relocateDocFields(turn, TURN_FIELDS, { mutate: false })).results
      );
    }

    const msg =
      `Медиа-хост: ${getCurrentMediaHost()}. Ходов: ${turns.length}. ` +
      `К переносу: ${counts.wouldMove}, отложено (внешние): ${counts.deferred}, ` +
      `неопознано: ${counts.unknown}.` +
      (details.length ? '\n' + details.join('\n') : '');
    return [true, msg];
  } catch (err) {
    return [false, err.message];
  }
};

// Перенос: скачивает «чужие» прямые файлы на текущий медиа-сервер и переписывает ссылки.
// Идемпотентен — повторный запуск пропускает уже перенесённое (host уже текущий).
const run = async ({ gameId } = {}) => {
  try {
    const game = await resolveGame(gameId);
    const turns = await Turn.find({ gameId });

    const counts = { moved: 0, deferred: 0, unknown: 0 };
    const errors = [];

    const process = async (doc, fields, label) => {
      const res = await relocateDocFields(doc, fields);
      if (res.changed) await doc.save();
      for (const r of res.results) {
        if (r.status === 'moved') counts.moved++;
        else if (r.status === 'deferred') counts.deferred++;
        else if (r.status === 'unknown') counts.unknown++;
        else if (r.status === 'error')
          errors.push(`${label}.${r.field} (${r.from}): ${r.error}`);
      }
    };

    await process(game, GAME_FIELDS, 'game');
    for (const turn of turns) {
      await process(turn, TURN_FIELDS, `turn ${turn._id}`);
    }

    const msg =
      `Перенесено: ${counts.moved}. Отложено (внешние): ${counts.deferred}. ` +
      `Неопознано: ${counts.unknown}.` +
      (errors.length ? ` Ошибок: ${errors.length}.\n` + errors.join('\n') : '');
    // success=false, если были ошибки переноса — чтобы это было видно в ответе.
    return [errors.length === 0, msg];
  } catch (err) {
    return [false, err.message];
  }
};

module.exports = { check, run };
