const { BOT_UPLOAD_DAILY_LIMIT } = require('../../../config/bot');
const { STATIC_MEDIA_URL } = require('../../../config/url');
const { getToken } = require('../../game/services/game');
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

const isForward = (msg) => {
  return !!msg.forward_date;
}

const hasMedia = (msg) => {
  return (
    !!msg.photo ||
    !!msg.video ||
    !!msg.audio ||
    // msg.voice ||
    // msg.document ||
    false
  );
}

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
  let type = null;
  if (isYoutubeUrl(msg.link_preview_options.url)) {
    type = 'video';
  } else if (isPhotoUrl(msg.link_preview_options.url)) {
    type = 'photo';
  }

  if (!type) {
    return null;
  }
  return {
    type,
    url: msg.link_preview_options.url,
  };
}

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
}

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

    if (fileType === 'videos' && message.video.thumb) {
      filePreview = await getTgFileUrlWithReverseDownload(
        message.video.thumb.file_id,
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

const prepareTurnByMsg = async (message, uploadedObject) => {
  // Определение типа контента
  let contentType = 'picture';
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

  const lastTurnExample = { x: 0, y: 0, width: 0 };
  const { x = 0, y = 0, width = 0 } = lastTurnExample;

  // Заполнение полей хода
  const header = message.forward_from_chat?.title || message.audio?.title || message.video?.title || '';
  const body = {
    // gameId,
    contentType,
    header,
    dontShowHeader: !header,
    imageUrl: null,
    videoUrl: null,
    videoPreview: null,
    audioUrl: null,
    paragraph: message.caption || message.text ? [{ insert: message.caption || message.text }] : undefined,
    // paragraphEntities: message.caption_entities || message.entities,
    sourceUrl: message.forward_from_message_id
      ? `https://t.me/${message.forward_from_chat.username}/${message.forward_from_message_id}`
      : null,
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

module.exports = {
  isForward,
  hasMedia,
  getPreviewInfo,
  getMediaInfo,

  getFileInfo,
  prepareUploadedObject,
  prepareTurnByMsg,
  setBot,
};
