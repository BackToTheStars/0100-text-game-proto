const { isValidObjectId } = require('mongoose');

const { getError } = require('../../core/services/errors');
const Turn = require('../../game/models/Turn');
const {
  classifyUrl,
  relocateDocFields,
  probeYoutubeVideo,
  relocateYoutubeVideo,
  MEDIA_TYPE_VIDEOS,
  PROVIDER_YOUTUBE,
  TURN_FIELDS,
} = require('../../game/services/mediaRelocate');
const { hashFunc } = require('../../game/services/security');

const list = async (req, res, next) => {
  try {
    const {
      skip = 0,
      limit = 100,
      gameId,
      searchText = '',
      contentType = '',
      sort = 'updatedAt',
      sortDir = 'desc',
    } = req.query;
    const criteria = {};
    if (gameId) {
      criteria.gameId = gameId;
    }
    if (contentType) {
      criteria.contentType = contentType;
    }
    if (searchText) {
      criteria.header = { $regex: searchText, $options: 'i' };
    }
    const items = await Turn.find(criteria)
      .skip(+skip)
      .limit(+limit)
      .sort({ [sort]: sortDir === 'asc' ? 1 : -1 });
    const count = await Turn.countDocuments(criteria);
    res.json({
      count,
      items,
    });
  } catch (err) {
    next(err);
  }
};

// битый id роняет findById CastError'ом, отсюда общая 500 вместо 404
const resolveTurn = async (turnId) => {
  const turn = isValidObjectId(turnId) ? await Turn.findById(turnId) : null;
  if (!turn) {
    throw getError(`Ход ${turnId} не найден`, 404);
  }
  return turn;
};

const getById = async (req, res, next) => {
  try {
    const item = await resolveTurn(req.params.id);
    res.json({
      item,
    });
  } catch (err) {
    next(err);
  }
};

// Перенос всех «чужих» медиа хода одним вызовом. Аудио-специфики в слое relocate нет:
// он одинаково обрабатывает все пять полей хода (TURN_FIELDS), поэтому отдельная ручка
// на каждое поле не нужна.
const relocateMedia = async (req, res, next) => {
  try {
    const { turnId } = req.body;
    const turn = await resolveTurn(turnId);

    const { changed, results } = await relocateDocFields(turn, TURN_FIELDS, {
      hash: hashFunc(turn.gameId),
    });
    if (changed) {
      // validateModifiedOnly: голый save() валидирует документ целиком, и ход с
      // легаси-contentType вне enum (чинится скриптом SCRIPT_TURN_CONTENT_TYPE)
      // отвечал бы 500 — уже после того, как media сохранила файл, то есть
      // каждая попытка переноса плодила бы копию в GridFS без потребителя.
      await turn.save({ validateModifiedOnly: true });
    }

    // Результат по каждому полю отдаём как есть (moved / local / deferred / unknown /
    // error), не сворачивая в текст: его разбирает UI. Ошибка одного поля не делает
    // весь вызов неуспешным — остальные поля могли переехать, и это видно в results.
    res.json({
      item: {
        turn,
        results,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Обе youtube-ручки работают только с ходом, у которого videoUrl — ссылка на
// YouTube, которую слой не умеет забрать напрямую ('deferred'). Проверяем до
// похода в media: на пустом, на уже перенесённом ('local') и на чужом видео
// отказываем сами, media при этом не дёргается.
const requireYoutubeVideoUrl = (turn) => {
  const { videoUrl } = turn;
  if (!videoUrl) {
    throw getError('У хода нет videoUrl', 400);
  }
  const cls = classifyUrl(videoUrl, MEDIA_TYPE_VIDEOS);
  if (cls.status !== 'deferred' || cls.provider !== PROVIDER_YOUTUBE) {
    throw getError(
      `videoUrl хода не ссылка на YouTube: ${cls.status}` +
        (cls.provider ? ` (${cls.provider})` : ''),
      400
    );
  }
  return videoUrl;
};

// Варианты ролика для выбора в UI. Тело media пробрасываем как есть
// ({ title, duration, formats }) — пересобирать его значит завязаться на форму.
const youtubeProbe = async (req, res, next) => {
  try {
    const { turnId } = req.body;
    const turn = await resolveTurn(turnId);
    const videoUrl = requireYoutubeVideoUrl(turn);

    const info = await probeYoutubeVideo(videoUrl, hashFunc(turn.gameId));

    res.json({
      item: info,
    });
  } catch (err) {
    next(err);
  }
};

// Перенос выбранного варианта. Конверт тот же, что у relocateMedia
// ({ item: { turn, results } }), чтобы UI разбирал оба ответа одинаково.
// Операция синхронная и долгая (минуты) — см. таймауты в слое и решение 5 BP-4
// про proxy_read_timeout на этих роутах.
const youtubeRelocate = async (req, res, next) => {
  try {
    const { turnId, formatId } = req.body;
    const turn = await resolveTurn(turnId);
    requireYoutubeVideoUrl(turn);
    // formatId — строка-селектор yt-dlp ('137+140'); проверяем только, что она
    // есть, разбирать её — дело media.
    if (!formatId || typeof formatId !== 'string') {
      throw getError('Не передан formatId', 400);
    }

    const { changed, results } = await relocateYoutubeVideo(turn, formatId, {
      hash: hashFunc(turn.gameId),
    });
    if (changed) {
      // validateModifiedOnly — как в relocateMedia: легаси-contentType не
      // должен валить сохранение после того, как видео уже скачано.
      await turn.save({ validateModifiedOnly: true });
    }

    res.json({
      item: {
        turn,
        results,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  relocateMedia,
  youtubeProbe,
  youtubeRelocate,
};
