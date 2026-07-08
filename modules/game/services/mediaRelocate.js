const { STATIC_MEDIA_URL } = require('../../../config/url');
// Переиспользуем готовый транспорт: media сам скачивает файл по URL и кладёт в GridFS,
// возвращая новый src на текущем медиа-сервере (тот же путь, что использует бот).
const { reverseDownloadMedia } = require('../../bot/lib/turnService');

// Типы медиа = сегменты путей media-сервиса (/images/, /videos/, /audios/).
const MEDIA_TYPE_IMAGES = 'images';
const MEDIA_TYPE_VIDEOS = 'videos';
const MEDIA_TYPE_AUDIOS = 'audios';

// Поддерживаемые расширения по типу — зеркало media/config/media.js (dMediaTypes).
// При изменении там — синхронизировать здесь.
const SUPPORTED_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'],
  videos: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
  audios: ['mp3', 'm4a', 'wav', 'ogg', 'webm'],
};

// Известные внешние провайдеры, у которых по прямой ссылке файл не скачать
// (нужны спец-библиотеки: yt-dlp и т.п.). Помечаем как 'deferred' — отдельная задача.
// Точка расширения: сюда же добавлять новых провайдеров и (в будущем) их загрузчики.
const EXTERNAL_PROVIDERS = [
  {
    name: 'youtube',
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

module.exports = {
  MEDIA_TYPE_IMAGES,
  MEDIA_TYPE_VIDEOS,
  MEDIA_TYPE_AUDIOS,
  SUPPORTED_EXTENSIONS,
  getCurrentMediaHost,
  classifyUrl,
  isForeignMediaUrl,
  relocateUrl,
  relocateDocFields,
};
