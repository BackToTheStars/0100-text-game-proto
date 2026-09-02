const axios = require('axios');

const { STATIC_MEDIA_URL } = require('../../../config/url');
const { getError } = require('../../core/services/errors');
// Переиспользуем готовый транспорт: media сам скачивает файл по URL и кладёт в GridFS,
// возвращая новый src на текущем медиа-сервере (тот же путь, что использует бот).
const { reverseDownloadMedia } = require('../../bot/lib/turnService');
const { getToken } = require('./game');

// Типы медиа = сегменты путей media-сервиса (/images/, /videos/, /audios/, /pdfs/).
const MEDIA_TYPE_IMAGES = 'images';
const MEDIA_TYPE_VIDEOS = 'videos';
const MEDIA_TYPE_AUDIOS = 'audios';
const MEDIA_TYPE_PDFS = 'pdfs';

// Явные поля документов со ссылками на медиа и их типы. Список один на всех
// потребителей — админский скрипт по всей игре и точечный перенос медиа одного хода.
const TURN_FIELDS = [
  ['imageUrl', MEDIA_TYPE_IMAGES],
  ['videoUrl', MEDIA_TYPE_VIDEOS],
  ['videoPreview', MEDIA_TYPE_IMAGES],
  ['audioUrl', MEDIA_TYPE_AUDIOS],
  ['pdfUrl', MEDIA_TYPE_PDFS],
];
const GAME_FIELDS = [
  ['image', MEDIA_TYPE_IMAGES], // обложка самой игры
];

// Поддерживаемые расширения по типу — зеркало media/config/media.js (dMediaTypes).
// При изменении там — синхронизировать здесь.
const SUPPORTED_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
  audios: ['mp3', 'm4a', 'wav', 'ogg', 'webm'],
  pdfs: ['pdf'],
};

const PROVIDER_YOUTUBE = 'youtube';

// Известные внешние провайдеры, у которых по прямой ссылке файл не скачать
// (нужны спец-библиотеки: yt-dlp и т.п.). Помечаем как 'deferred' — прямого
// переноса для них нет. Точка расширения: сюда добавляются новые провайдеры, а их
// загрузчики — вниз файла, рядом с youtube-транспортом.
const EXTERNAL_PROVIDERS = [
  {
    name: PROVIDER_YOUTUBE,
    test: (h) =>
      h === 'youtu.be' ||
      h.endsWith('youtube.com') ||
      h.endsWith('youtube-nocookie.com'),
  },
  {
    name: 'twitter/x',
    test: (h) =>
      h === 'x.com' ||
      h.endsWith('.x.com') ||
      h === 'twitter.com' ||
      h.endsWith('.twitter.com'),
  },
  {
    name: 'vimeo',
    test: (h) => h === 'vimeo.com' || h.endsWith('.vimeo.com'),
  },
];

const matchExternalProvider = (host) => {
  const h = host.toLowerCase();
  const found = EXTERNAL_PROVIDERS.find((p) => p.test(h));
  return found ? found.name : null;
};

// Хост (host:port) текущего медиа-сервера — с ним сравниваем ссылки.
const getCurrentMediaHost = () => {
  try {
    return new URL(STATIC_MEDIA_URL).host;
  } catch {
    return null;
  }
};

// Расширение из pathname (без query/hash — их URL.pathname уже отбрасывает).
const getExtensionFromPathname = (pathname) => {
  const seg = pathname.split('/').pop() || '';
  const i = seg.lastIndexOf('.');
  return i < 0 ? '' : seg.slice(i + 1).toLowerCase();
};

// Классификация ссылки относительно текущего медиа-хоста и типа поля.
// Возвращает { status, provider?, ext? }:
//   'local'    — пусто / относительный / не-http / уже на текущем хосте → не трогаем
//   'deferred' — известный внешний провайдер (youtube и т.п.); прямое скачивание не поддержано
//   'foreign'  — прямой файл нужного типа на другом хосте → переносим
//   'unknown'  — другой хост, но не распознан как файл нужного типа и не известный провайдер
const classifyUrl = (url, type) => {
  if (typeof url !== 'string' || !url) return { status: 'local' };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { status: 'local' }; // относительный/битый URL — не трогаем
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { status: 'local' };
  }

  const current = getCurrentMediaHost();
  if (current && parsed.host === current) return { status: 'local' };

  const provider = matchExternalProvider(parsed.host);
  if (provider) return { status: 'deferred', provider };

  const ext = getExtensionFromPathname(parsed.pathname);
  if (ext && (SUPPORTED_EXTENSIONS[type] || []).includes(ext)) {
    return { status: 'foreign', ext };
  }
  return { status: 'unknown', ext: ext || null };
};

// Совместимый булев хелпер: «переносим ли этот URL».
const isForeignMediaUrl = (url, type) => classifyUrl(url, type).status === 'foreign';

// Перенести один URL, если он 'foreign'. Возвращает status из classifyUrl,
// а для прямого файла — 'moved' (+ url) или 'error' (+ error):
//   'local' | 'deferred'(+provider) | 'unknown' | 'moved'(+url) | 'error'(+error)
const relocateUrl = async (url, type, hash = 'admin-relocate') => {
  const cls = classifyUrl(url, type);
  if (cls.status !== 'foreign') {
    return { status: cls.status, provider: cls.provider };
  }
  try {
    const newUrl = await reverseDownloadMedia(type, url, hash);
    if (!newUrl) return { status: 'error', error: 'empty src from media' };
    return { status: 'moved', url: newUrl };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
};

// Перенести перечисленные поля документа (mongoose-документ или plain-объект).
// fieldTypes: [[field, type], ...].
// options.mutate === false → только классифицировать (dry-run), без обращений к media.
// Возвращает { changed, results: [{ field, from, status, provider?, url?, error? }] }.
// Документ НЕ сохраняется здесь — вызывающий сам решает, звать ли doc.save().
const relocateDocFields = async (doc, fieldTypes, options = {}) => {
  const { mutate = true, hash } = options;
  const results = [];
  let changed = false;

  for (const [field, type] of fieldTypes) {
    const from = doc[field];

    if (mutate === false) {
      const cls = classifyUrl(from, type);
      results.push({
        field,
        from,
        status: cls.status === 'foreign' ? 'would-move' : cls.status,
        provider: cls.provider,
      });
      continue;
    }

    const res = await relocateUrl(from, type, hash);
    if (res.status === 'moved') {
      doc[field] = res.url;
      changed = true;
    }
    results.push({ field, from, ...res });
  }

  return { changed, results };
};

// ─── YouTube ────────────────────────────────────────────────────────────────
// Второй транспорт до media: прямой ссылкой такое видео не забрать, его тянет
// yt-dlp внутри media. Токен тот же сервисный, что у download-and-save,
// отличается только операция.
const YOUTUBE_OPERATION = 'youtube';
const YOUTUBE_TOKEN_TTL = 5 * 60 * 1000;

// У media probe ограничен 60 с, скачивание — 30 мин (media/config/timeouts.js).
// Свои таймауты держим заведомо больше: пусть до клиента доходит 504 от media с
// причиной, а не обрыв на нашей стороне. Операция синхронная и долгая — 22 МБ
// качались 3 мин 23 с, так что таймаут здесь не «на всякий случай» (у axios его
// по умолчанию нет вовсе), а осознанный потолок.
const YOUTUBE_PROBE_TIMEOUT = 90 * 1000;
const YOUTUBE_DOWNLOAD_TIMEOUT = 35 * 60 * 1000;

// Обложка ролика: тот же адрес, что до сих пор собирал клиент
// (client/modules/turns/components/helpers/videoUrl.js).
const YOUTUBE_THUMB_HOST = 'img.youtube.com';
const YOUTUBE_ID_RE = /^[\w-]{6,20}$/;

// id ролика из любых форм ссылки: watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/.
const getYoutubeVideoId = (url) => {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/')[1] || '';
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }
  if (matchExternalProvider(host) !== PROVIDER_YOUTUBE) return null;

  const v = parsed.searchParams.get('v');
  if (v && YOUTUBE_ID_RE.test(v)) return v;
  const match = parsed.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{6,20})/);
  return match ? match[2] : null;
};

const getYoutubePreviewUrl = (videoId) =>
  `https://${YOUTUBE_THUMB_HOST}/vi/${videoId}/hqdefault.jpg`;

const isYoutubeThumbUrl = (url) => {
  try {
    return new URL(url).host.toLowerCase() === YOUTUBE_THUMB_HOST;
  } catch {
    return false;
  }
};

const getYoutubeToken = (hash) =>
  getToken(
    process.env.JWT_SECRET_STATIC,
    YOUTUBE_OPERATION,
    new Date().getTime() + YOUTUBE_TOKEN_TTL,
    hash
  );

// Ошибка обращения к media → ошибка с HTTP-кодом для нашего клиента.
// Коды media осмысленны (400 — нет варианта / неподдержанный тип, 413 — больше
// лимита, 502 — yt-dlp/ffmpeg, 504 — таймаут), поэтому пробрасываются как есть:
// UI нужна причина, а не общая 502. Исключение — 500: наш обработчик ошибок
// заменяет текст любой 500 на «На сервере произошла ошибка», и причина потерялась
// бы. Если соединения не случилось — 503; message бывает пустым (AggregateError
// от happy-eyeballs), тогда причину несёт только code. Этим же helper'ом
// пользуется stats-прокси (modules/admin/controllers/Media.js) — разбор ошибок
// media один на все обращения к ней.
const mediaRequestError = (err) => {
  if (err.response) {
    const message = err.response.data && err.response.data.message;
    const status = err.response.status === 500 ? 502 : err.response.status;
    return getError(
      `Медиа-сервер вернул ошибку (${err.response.status})` +
        (message ? `: ${message}` : ''),
      status
    );
  }
  const reason = err.message || err.code || 'причина неизвестна';
  return getError(`Медиа-сервер недоступен (${STATIC_MEDIA_URL}): ${reason}`, 503);
};

// Варианты ролика: { title, duration, formats: [...] } — отдаём как есть, тело
// media не пересобираем, иначе сервер завяжется на его форму.
const probeYoutubeVideo = async (url, hash) => {
  try {
    const resp = await axios({
      method: 'post',
      url: STATIC_MEDIA_URL + '/youtube/probe',
      headers: {
        Authorization: 'Bearer ' + getYoutubeToken(hash),
        'Content-Type': 'application/json',
      },
      data: { url },
      timeout: YOUTUBE_PROBE_TIMEOUT,
    });
    return resp.data;
  } catch (err) {
    throw mediaRequestError(err);
  }
};

// formatId — строка-селектор yt-dlp ('137+140'); здесь она не разбирается и
// уходит в media как есть.
const downloadYoutubeVideo = async ({ url, formatId, hash, metadata }) => {
  try {
    const resp = await axios({
      method: 'post',
      url: STATIC_MEDIA_URL + '/youtube/download',
      headers: {
        Authorization: 'Bearer ' + getYoutubeToken(hash),
        'Content-Type': 'application/json',
      },
      data: { url, formatId, metadata },
      timeout: YOUTUBE_DOWNLOAD_TIMEOUT,
    });
    return resp.data;
  } catch (err) {
    throw mediaRequestError(err);
  }
};

// Обложка. Заполненное превью переносим по общим правилам, пустое — собираем по
// id ролика тем адресом, которым до сих пор пользовался клиент: как только
// videoUrl станет своим, клиентский фолбэк на img.youtube.com пропадёт, и без
// videoPreview карточка останется без обложки.
const relocateYoutubePreview = async (doc, videoUrl, hash) => {
  const field = 'videoPreview';
  const videoId = getYoutubeVideoId(videoUrl);
  const from = doc[field] || (videoId ? getYoutubePreviewUrl(videoId) : null);
  if (!from) {
    return {
      field,
      from: doc[field],
      status: 'unknown',
      error: 'не удалось определить id ролика',
    };
  }

  // img.youtube.com отдаёт прямой jpg, но classifyUrl видит там youtube-хост и
  // помечает ссылку 'deferred', так что relocateUrl её не возьмёт. Ровно для
  // этого адреса идём в тот же транспорт напрямую; всё остальное в videoPreview
  // разбирается общими правилами.
  if (isYoutubeThumbUrl(from)) {
    try {
      const url = await reverseDownloadMedia(MEDIA_TYPE_IMAGES, from, hash);
      if (!url) return { field, from, status: 'error', error: 'empty src from media' };
      doc[field] = url;
      return { field, from, status: 'moved', url };
    } catch (err) {
      return { field, from, status: 'error', error: err.message };
    }
  }

  const res = await relocateUrl(from, MEDIA_TYPE_IMAGES, hash);
  if (res.status === 'moved') {
    doc[field] = res.url;
  }
  return { field, from, ...res };
};

// Перенос YouTube-видео хода вместе с обложкой. Порядок важен: сначала видео,
// потом превью — неудача превью не отменяет уже перенесённое видео, она ложится
// отдельной строкой в results. Неудача самого видео — исключение с кодом от media
// (413 на превышение лимита и т.п.): переносить нечего, и молча считать это
// успехом нельзя. Формат results тот же, что у relocateDocFields, чтобы UI
// разбирал оба ответа одинаково. Документ НЕ сохраняется здесь.
const relocateYoutubeVideo = async (doc, formatId, options = {}) => {
  const { hash } = options;
  const from = doc.videoUrl;

  const { src } = await downloadYoutubeVideo({
    url: from,
    formatId,
    hash,
    metadata: { turnId: String(doc._id), gameId: String(doc.gameId) },
  });
  if (!src) {
    throw getError('Медиа-сервер не вернул ссылку на видео', 502);
  }
  doc.videoUrl = src;

  const results = [
    { field: 'videoUrl', from, status: 'moved', url: src, formatId },
    await relocateYoutubePreview(doc, from, hash),
  ];

  return { changed: true, results };
};

module.exports = {
  MEDIA_TYPE_IMAGES,
  MEDIA_TYPE_VIDEOS,
  MEDIA_TYPE_AUDIOS,
  MEDIA_TYPE_PDFS,
  PROVIDER_YOUTUBE,
  TURN_FIELDS,
  GAME_FIELDS,
  SUPPORTED_EXTENSIONS,
  getCurrentMediaHost,
  classifyUrl,
  isForeignMediaUrl,
  relocateUrl,
  relocateDocFields,
  getYoutubeVideoId,
  mediaRequestError,
  probeYoutubeVideo,
  relocateYoutubeVideo,
};
