const BOT_UPLOAD_DAILY_LIMIT = process.env.BOT_UPLOAD_DAILY_LIMIT || 200000000; // ~200MB
const BOT_UPLOAD_FILE_TIME_LOCK =
  process.env.BOT_UPLOAD_FILE_TIME_LOCK || 10000;

// Максимальный размер видео из x.com для скачивания на медиа-сервер (~100MB).
// Медиа-сервер грузит файл в память целиком и своих лимитов не имеет,
// поэтому превышение (или неизвестный размер) — видео пропускается,
// ход создаётся с превью-картинкой и ссылкой.
const BOT_XCOM_VIDEO_MAX_FILE_SIZE =
  Number(process.env.BOT_XCOM_VIDEO_MAX_FILE_SIZE) || 100000000;

module.exports = {
  BOT_UPLOAD_DAILY_LIMIT,
  BOT_UPLOAD_FILE_TIME_LOCK,
  BOT_XCOM_VIDEO_MAX_FILE_SIZE,
};
