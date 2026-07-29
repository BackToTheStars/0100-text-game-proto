const {
  BOT_UPLOAD_DAILY_LIMIT,
  BOT_XCOM_VIDEO_MAX_FILE_SIZE,
} = require('../../../config/bot');
const { STATIC_MEDIA_URL } = require('../../../config/url');
const { getToken } = require('../../game/services/game');
const xcomService = require('./xcomService');
const axios = require('axios');

const dailyUploaded = {};
const checkUpdateDaylyLimit = (volume) => {
  const date = new Date();
  const day = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
    -2
  )}-${('0' + date.getDate()).slice(-2)}`;
  if (!dailyUploaded[day]) {
    dailyUploaded[day] = 0;
  }
  if (dailyUploaded[day] + volume > BOT_UPLOAD_DAILY_LIMIT) {
    console.log(dailyUploaded[day], BOT_UPLOAD_DAILY_LIMIT);
    return false;
  }
  dailyUploaded[day] += volume;
  return true;
};

const vars = {
  bot: null,
};

const setBot = (bot) => {
  vars.bot = bot;
};

// Bot API >= 7.0: сведения о форварде лежат в forward_origin,
// legacy-поле forward_date оставлено как фолбэк для старых серверов
const isForward = (msg) => {
  return !!(msg?.forward_origin || msg?.forward_date);
};

const getForwardTitle = (msg) => {
  const origin = msg?.forward_origin;
  if (origin) {
    if (origin.chat?.title) {
      // type === 'channel'
      return origin.chat.title;
    }
    if (origin.sender_chat?.title) {
      // type === 'chat' (отправитель от имени чата)
      return origin.sender_chat.title;
    }
    if (origin.sender_user) {
      // type === 'user'
      return [origin.sender_user.first_name, origin.sender_user.last_name]
        .filter(Boolean)
        .join(' ');
    }
    if (origin.sender_user_name) {
      // type === 'hidden_user'
      return origin.sender_user_name;
    }
  }
  // legacy Bot API < 7.0
  return msg?.forward_from_chat?.title || '';
};

const getForwardSourceUrl = (msg) => {
  const origin = msg?.forward_origin;
  if (origin?.type === 'channel' && origin.chat?.username && origin.message_id) {
    return `https://t.me/${origin.chat.username}/${origin.message_id}`;
  }
  // legacy Bot API < 7.0
  if (msg?.forward_from_message_id && msg?.forward_from_chat?.username) {
    return `https://t.me/${msg.forward_from_chat.username}/${msg.forward_from_message_id}`;
  }
  return null;
};

const hasMedia = (msg) => {
  return (
    !!msg.photo ||
    !!msg.video ||
    !!msg.audio ||
    // msg.voice ||
    // msg.document ||
    false
  );
};

const isYoutubeUrl = (url) => {
  if (!url) {
    return false;
  }
  return url.includes('youtu.be') || url.includes('youtube.com');
};

const isPhotoUrl = (url) => {
  if (!url) {
    return false;
  }
  return url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg');
};

const getPreviewInfo = (msg) => {
  if (!msg.link_preview_options) {
    return null;
  }
  const url = msg.link_preview_options.url;
  let type = null;
  if (xcomService.isXcomUrl(url)) {
    type = 'xcom';
  } else if (isYoutubeUrl(url)) {
    type = 'video';
  } else if (isPhotoUrl(url)) {
    type = 'photo';
  }

  if (!type) {
    return null;
  }
  return {
    type,
    url,
  };
};

const getMediaInfo = (msg) => {
  if (msg.photo) {
    return {
      type: 'photo',
      file_size: msg.photo.at(-1).file_size,
    };
  } else if (msg.video) {
    return {
      type: 'video',
      file_size: msg.video.file_size,
    };
  } else if (msg.audio) {
    return {
      type: 'audio',
      file_size: msg.audio.file_size,
    };
  } else {
    return null;
  }
};

const getFileInfo = (message) => {
  let needToUploadMedia = false;
  let fileType = '';
  let fileObj = null;

  if (message.video) {
    needToUploadMedia = true;
    fileType = 'videos';
    fileObj = message.video;
  } else if (message.audio) {
    needToUploadMedia = true;
    fileType = 'audios';
    fileObj = message.audio;
  } else if (message.photo) {
    needToUploadMedia = true;
    fileType = 'images';
    fileObj = message.photo.at(-1);
  }

  return {
    needToUploadMedia,
    fileType,
    fileObj,
  };
};

const reverseDownloadMedia = async (type, mediaUrl, hash) => {
  const tokenStaticServer = getToken(
    process.env.JWT_SECRET_STATIC,
    'download_and_save',
    new Date().getTime() + 5 * 60 * 1000,
    hash
  );

  const config = {
    method: 'post',
    url: STATIC_MEDIA_URL + `/${type}/download-and-save`,
    headers: {
      Authorization: 'Bearer ' + tokenStaticServer,
      'Content-Type': 'application/json',
    },
    data: {
      mediaUrl,
    },
  };

  const resp = await axios(config);
  return resp.data.src;
};

const getTgFileUrlWithReverseDownload = async (fileId, type, code) => {
  const userFile = await vars.bot.telegram.getFile(fileId);
  const resultFilePath = await fetch(`${process.env.BOT_STATIC_URL}/get-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_path: userFile.file_path }),
  });

  if (resultFilePath.ok) {
    const { host_path } = await resultFilePath.json();
    const fileUrl = `${process.env.BOT_STATIC_URL}${host_path}`;

    const url = await reverseDownloadMedia(type, fileUrl, code);
    return url;
  }

  return null;
};

const prepareUploadedObject = async (message, fileType, fileObj, code) => {
  try {
    if (!fileObj) {
      return null;
    }
    if (!checkUpdateDaylyLimit(fileObj.file_size)) {
      return null;
    }
    const fileUrl = await getTgFileUrlWithReverseDownload(
      fileObj.file_id,
      fileType,
      code
    );

    let filePreview = null;

    // Bot API >= 6.6: thumb переименован в thumbnail
    const videoThumb = message.video?.thumbnail || message.video?.thumb;
    if (fileType === 'videos' && videoThumb) {
      filePreview = await getTgFileUrlWithReverseDownload(
        videoThumb.file_id,
        'images',
        code
      );
    }

    return {
      fileType,
      fileUrl,
      filePreview,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Вспомогательная функция для расчета высоты
const calculateHeight = (body) => {
  const { contentType, paragraph, header } = body;

  switch (contentType) {
    case 'picture':
      return 600; // Высота для изображений
    case 'audio':
      return 50 + 28 + (paragraph ? 40 + 14 : 0); // Аудио + текст (если есть)
    case 'video':
      return 225 + 28 + (paragraph ? 40 + 14 : 0) + (header ? 40 + 14 : 0); // Видео + текст + заголовок (если есть)
    default:
      return 600; // По умолчанию для других типов
  }
};

const getParagraphByTextWithEntities = (text, entities) => {
  const allEntities = [];
  let currentPos = 0;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity.offset > currentPos) {
      allEntities.push({
        offset: currentPos,
        length: entity.offset - currentPos,
        type: 'plain',
      });
    }
    allEntities.push(entity);
    currentPos = entity.offset + entity.length;
  }

  if (currentPos < text.length) {
    allEntities.push({
      offset: currentPos,
      length: text.length - currentPos,
      type: 'plain',
    });
  }

  return allEntities.map((entity) => {
    const part = {
      insert: text.slice(entity.offset, entity.offset + entity.length),
    };
    if (entity.type === 'text_link') {
      part.attributes = {
        link: entity.url,
      };
      // other types: bold, italic, underline
    }
    return part;
  });
};

const prepareTurnByMsg = async (message, uploadedObject) => {
  // Определение типа контента
  let contentType = null;
  // @todo: упростить
  if (uploadedObject?.fileType) {
    if (uploadedObject.fileType === 'images') {
      contentType = 'picture';
    } else if (uploadedObject.fileType === 'videos') {
      contentType = 'video';
    } else if (uploadedObject.fileType === 'audios') {
      contentType = 'audio';
    } else {
      contentType = 'picture';
    }
  } else if (message.photo) {
    contentType = 'picture';
  } else if (message.audio) {
    contentType = 'audio';
  } else if (message.video) {
    contentType = 'video';
  } else if (message.link_preview_options?.url) {
    const url = message.link_preview_options.url;
    if (isYoutubeUrl(url)) {
      contentType = 'video';
    } else if (isPhotoUrl(url)) {
      contentType = 'picture';
    }
  }
  if (!contentType) {
    // текст без медиа и превью (например, форвард текстового сообщения)
    contentType = 'comment';
  }

  const lastTurnExample = { x: 0, y: 0, width: 0 };
  const { x = 0, y = 0, width = 0 } = lastTurnExample;

  // Заполнение полей хода
  const header =
    getForwardTitle(message) ||
    message.audio?.title ||
    message.video?.title ||
    '';

  const text = message.caption || message.text || '';
  const textEntities = message.caption_entities || message.entities;
  const paragraph = textEntities
    ? getParagraphByTextWithEntities(text, textEntities)
    : [{ insert: text }];

  const body = {
    // gameId,
    contentType,
    header,
    dontShowHeader: !header,
    imageUrl: null,
    videoUrl: null,
    videoPreview: null,
    audioUrl: null,
    paragraph,
    sourceUrl: getForwardSourceUrl(message),
    date: message.date ? message.date * 1000 : null,
    x: x + width + 50,
    y,
    width: contentType === 'picture' ? 600 : 400,
  };

  body.height = calculateHeight(body);

  // Заполнение медиа-ссылок
  if (uploadedObject) {
    if (uploadedObject.fileType === 'images') {
      body.imageUrl = uploadedObject.fileUrl;
    } else if (uploadedObject.fileType === 'videos') {
      body.videoUrl = uploadedObject.fileUrl;
      body.videoPreview = uploadedObject.filePreview;
    } else if (uploadedObject.fileType === 'audios') {
      body.dontShowHeader = true;
      body.audioUrl = uploadedObject.fileUrl;
    }
  } else if (message.link_preview_options?.url) {
    const url = message.link_preview_options.url;
    if (isYoutubeUrl(url)) {
      body.videoUrl = url;
    } else if (isPhotoUrl(url)) {
      body.imageUrl = url;
    }
  }

  return body;
};

// HEAD-запрос за размером файла; null — размер выяснить не удалось
const getRemoteFileSize = async (url) => {
  try {
    const resp = await axios.head(url, { timeout: 5000, maxRedirects: 3 });
    const len = parseInt(resp.headers['content-length'], 10);
    return Number.isFinite(len) && len > 0 ? len : null;
  } catch (err) {
    console.error('[xcom] HEAD failed', err.response?.status || err.message);
    return null;
  }
};

// t.co-ссылка на собственные вложения твита (фото/видео) — в тексте не нужна,
// медиа обрабатывается отдельно
const isTweetMediaUrl = (expandedUrl) =>
  !!expandedUrl && /\/status\/\d+\/(photo|video)\/\d+/.test(expandedUrl);

// Текст твита + entities.urls → quill-ops с кликабельными ссылками.
// Индексы start/end в API v2 считаются в кодпоинтах, не в UTF-16-юнитах
const getTweetTextOps = (text, urlEntities = []) => {
  const cps = Array.from(text);
  const entities = urlEntities
    .filter(
      (u) =>
        Number.isInteger(u.start) &&
        Number.isInteger(u.end) &&
        u.start < u.end &&
        u.end <= cps.length
    )
    .sort((a, b) => a.start - b.start);

  const ops = [];
  let pos = 0;
  for (const u of entities) {
    if (u.start < pos) continue; // пересекающиеся — пропускаем
    if (u.start > pos) {
      ops.push({ insert: cps.slice(pos, u.start).join('') });
    }
    if (!isTweetMediaUrl(u.expanded_url)) {
      const link = u.expanded_url || u.url;
      ops.push({ insert: u.display_url || link, attributes: { link } });
    }
    pos = u.end;
  }
  if (pos < cps.length) {
    ops.push({ insert: cps.slice(pos).join('') });
  }

  // хвостовые пробелы/переносы (остаются после вырезания медиа-ссылок)
  const last = ops[ops.length - 1];
  if (last && !last.attributes) {
    last.insert = last.insert.replace(/\s+$/, '');
    if (!last.insert) ops.pop();
  }
  return ops.length ? ops : null;
};

const buildXcomParagraph = (data) => {
  const ops = (data.text && getTweetTextOps(data.text, data.urls)) || [
    { insert: data.normalizedUrl, attributes: { link: data.normalizedUrl } },
  ];

  // цитируемый твит — одним блоком после текста
  if (data.quoted?.text) {
    const q = data.quoted;
    const qLabel = q.authorHandle ? `@${q.authorHandle}` : q.authorName || 'quote';
    ops.push({ insert: '\n\n↩ ' });
    ops.push(
      q.url ? { insert: qLabel, attributes: { link: q.url } } : { insert: qLabel }
    );
    ops.push({ insert: `: ${q.text}` });
  }
  return ops;
};

const prepareXcomTurn = async (message, url, code) => {
  const data = await xcomService.fetchTweetData(url);

  // Видео: вариант среднего битрейта, со страховкой от больших файлов —
  // медиа-сервер грузит файл в память целиком и своих лимитов не имеет,
  // поэтому при неизвестном размере видео не качаем
  let uploadedVideoUrl = null;
  let uploadedVideoPreview = null;
  if (data.videoUrl) {
    const size = await getRemoteFileSize(data.videoUrl);
    if (!size) {
      console.warn('[xcom] video size unknown, skip download', data.videoUrl);
    } else if (size > BOT_XCOM_VIDEO_MAX_FILE_SIZE) {
      console.warn(`[xcom] video too big (${size} bytes), skip download`);
    } else if (!checkUpdateDaylyLimit(size)) {
      console.warn('[xcom] daily upload limit reached, skip video');
    } else {
      try {
        uploadedVideoUrl = await reverseDownloadMedia('videos', data.videoUrl, code);
        if (data.videoPreviewUrl) {
          try {
            uploadedVideoPreview = await reverseDownloadMedia(
              'images',
              data.videoPreviewUrl,
              code
            );
          } catch (err) {
            console.error('[xcom] video preview upload failed', err.message);
          }
        }
      } catch (err) {
        console.error('[xcom] video upload failed', err.message);
      }
    }
  }

  // Картинка: фото твита; если видео пропущено/не скачалось — его превью как фолбэк
  let uploadedImageUrl = null;
  if (!uploadedVideoUrl) {
    const imageCandidate = data.imageUrl || data.videoPreviewUrl;
    if (imageCandidate) {
      const size = await getRemoteFileSize(imageCandidate);
      if (size && !checkUpdateDaylyLimit(size)) {
        console.warn('[xcom] daily upload limit reached, skip image');
      } else {
        // неизвестный размер для картинок допустим — они небольшие
        try {
          uploadedImageUrl = await reverseDownloadMedia(
            'images',
            imageCandidate,
            code
          );
        } catch (err) {
          console.error('[xcom] image upload failed', err.message);
        }
      }
    }
  }

  const contentType = uploadedVideoUrl
    ? 'video'
    : uploadedImageUrl
      ? 'picture'
      : 'comment';

  const paragraph = buildXcomParagraph(data);

  const header = data.authorName
    ? data.authorHandle
      ? `${data.authorName} (@${data.authorHandle})`
      : data.authorName
    : '';

  const body = {
    contentType,
    header,
    dontShowHeader: !header,
    imageUrl: uploadedImageUrl,
    videoUrl: uploadedVideoUrl,
    videoPreview: uploadedVideoPreview,
    audioUrl: null,
    paragraph,
    sourceUrl: data.normalizedUrl,
    date: data.createdAt || (message.date ? message.date * 1000 : null),
    x: 0,
    y: 0,
    width: contentType === 'picture' ? 600 : 400,
  };
  body.height = calculateHeight(body);
  return body;
};

module.exports = {
  isForward,
  hasMedia,
  getPreviewInfo,
  getMediaInfo,

  getFileInfo,
  prepareUploadedObject,
  prepareTurnByMsg,
  prepareXcomTurn,
  reverseDownloadMedia,
  setBot,
};
