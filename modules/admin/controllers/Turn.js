const { isValidObjectId } = require('mongoose');

const { getError } = require('../../core/services/errors');
const Turn = require('../../game/models/Turn');
const {
  classifyUrl,
  relocateUrl,
  relocateDocFields,
  probeYoutubeVideo,
  relocateYoutubeVideo,
  MEDIA_TYPE_AUDIOS,
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

const moveAudio = async (req, res, next) => {
  try {
    const { turnId, audioUrl } = req.body;
    const turn = await resolveTurn(turnId);
    if (!audioUrl || turn.audioUrl !== audioUrl) {
      throw getError('Audio url mismatch', 400);
    }

    // Перенос — через общий слой relocate: он же классифицирует ссылку (в том числе
    // «уже на нашем хосте», с нормальным сравнением хостов), он же держит единственный
    // транспорт до media (reverseDownloadMedia).
    const result = await relocateUrl(
      audioUrl,
      MEDIA_TYPE_AUDIOS,
      hashFunc(turn.gameId)
    );

    switch (result.status) {
      case 'moved':
        turn.audioUrl = result.url;
        await turn.save();
        return res.json({ item: turn });
      case 'local':
        throw getError('Аудио уже на текущем медиа-сервере', 400);
      case 'deferred':
        throw getError(
          `Аудио с ${result.provider}: прямое скачивание не поддержано`,
          400
        );
      case 'unknown':
        throw getError('Ссылка не распознана как аудио-файл', 400);
      case 'error':
        throw getError(`Не удалось перенести аудио: ${result.error}`, 502);
      default:
        // relocateUrl обзаведётся новыми статусами в BP-4 — молча считать их
        // успехом нельзя
        throw getError(`Неизвестный статус переноса: ${result.status}`, 500);
    }
  } catch (err) {
    next(err);
  }
};

// Перенос всех «чужих» медиа хода одним вызовом. Аудио-специфики в слое relocate нет:
// он одинаково обрабатывает все пять полей хода (TURN_FIELDS), поэтому отдельная ручка
// на каждое поле не нужна. moveAudio остаётся до переезда клиента на этот эндпоинт.
const relocateMedia = async (req, res, next) => {
  try {
    const { turnId } = req.body;
    const turn = await resolveTurn(turnId);

    const { changed, results } = await relocateDocFields(turn, TURN_FIELDS, {
      hash: hashFunc(turn.gameId),
    });
    if (changed) {
      await turn.save();
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
      await turn.save();
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
  moveAudio,
  relocateMedia,
  youtubeProbe,
  youtubeRelocate,
};
