const { isValidObjectId } = require('mongoose');

const { getError } = require('../../core/services/errors');
const Turn = require('../../game/models/Turn');
const {
  classifyUrl,
  getYoutubeVideoId,
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

// ─── Опись youtube-видео ────────────────────────────────────────────────────
// Список ходов, у которых videoUrl всё ещё ведёт на YouTube: что предстоит
// перезалить руками. Ручка только читает — автоматический перенос YouTube
// заморожен, и звать его отсюда нельзя.
//
// Признак «это YouTube» берётся у классификатора слоя relocate (classifyUrl),
// второй копии правил здесь нет — иначе опись и перенос разъехались бы. Отобрать
// такие ходы одним запросом к Mongo нельзя: классификатор смотрит ещё и на
// текущий медиа-хост. Поэтому база делает то, что умеет (отсев ходов без
// videoUrl и сортировку), а провайдер проверяется уже над выборкой; порядок при
// этом сохраняется, и страница режется после фильтра — иначе `total` врал бы.
const YOUTUBE_LIST_SORT_FIELDS = ['createdAt', 'updatedAt'];
const YOUTUBE_LIST_DEFAULT_SORT = 'updatedAt';
const YOUTUBE_LIST_DEFAULT_LIMIT = 50;
const YOUTUBE_LIST_MAX_LIMIT = 500;
const YOUTUBE_LIST_MAX_PAGE = 100000;

const parseListInteger = (value, name, { min, max, fallback }, errors) => {
  if (value === undefined || value === '') {
    return fallback;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    errors.push(`${name}: целое число от ${min} до ${max}, получено «${value}».`);
    return fallback;
  }
  return number;
};

// Ошибки собираются все сразу: чинить их по одной, каждый раз перезапрашивая
// ручку, — то ещё удовольствие (тот же приём, что в media у списка файлов).
const parseYoutubeListQuery = (query = {}) => {
  const errors = [];

  const sort =
    query.sort === undefined || query.sort === ''
      ? YOUTUBE_LIST_DEFAULT_SORT
      : String(query.sort);
  if (!YOUTUBE_LIST_SORT_FIELDS.includes(sort)) {
    errors.push(
      `sort: сортировка только по ${YOUTUBE_LIST_SORT_FIELDS.join(', ')}.`
    );
  }

  const order =
    query.order === undefined || query.order === ''
      ? 'desc'
      : String(query.order).toLowerCase();
  if (order !== 'asc' && order !== 'desc') {
    errors.push('order: только asc или desc.');
  }

  const page = parseListInteger(
    query.page,
    'page',
    { min: 1, max: YOUTUBE_LIST_MAX_PAGE, fallback: 1 },
    errors
  );
  const limit = parseListInteger(
    query.limit,
    'limit',
    { min: 1, max: YOUTUBE_LIST_MAX_LIMIT, fallback: YOUTUBE_LIST_DEFAULT_LIMIT },
    errors
  );

  if (errors.length > 0) {
    throw getError(errors.join(' '), 400);
  }

  return { sort, order, page, limit };
};

const youtubeList = async (req, res, next) => {
  try {
    const { sort, order, page, limit } = parseYoutubeListQuery(req.query);

    const docs = await Turn.find({ videoUrl: { $nin: [null, ''] } })
      .select({ header: 1, gameId: 1, videoUrl: 1, createdAt: 1, updatedAt: 1 })
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .lean();

    const youtubeDocs = docs.filter((doc) => {
      const cls = classifyUrl(doc.videoUrl, MEDIA_TYPE_VIDEOS);
      return cls.status === 'deferred' && cls.provider === PROVIDER_YOUTUBE;
    });

    const from = (page - 1) * limit;
    const items = youtubeDocs.slice(from, from + limit).map((doc) => ({
      turnId: String(doc._id),
      gameId: doc.gameId ? String(doc.gameId) : null,
      // hash игры считается из её id (hashFunc) — за самой игрой в базу
      // ходить не нужно.
      hash: doc.gameId ? hashFunc(doc.gameId) : null,
      header: doc.header || '',
      videoUrl: doc.videoUrl,
      // id ролика — той же утилитой, что собирает превью-обложку. У ссылки на
      // канал или плейлист его нет: тогда null, и обложку по строке не собрать.
      youtubeId: getYoutubeVideoId(doc.videoUrl),
      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
    }));

    res.json({
      items,
      total: youtubeDocs.length,
      page,
      limit,
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
  youtubeList,
  relocateMedia,
  youtubeProbe,
  youtubeRelocate,
};
