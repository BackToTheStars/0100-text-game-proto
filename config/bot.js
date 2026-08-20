const BOT_UPLOAD_DAILY_LIMIT = process.env.BOT_UPLOAD_DAILY_LIMIT || 200000000; // ~200MB
const BOT_UPLOAD_FILE_TIME_LOCK =
  process.env.BOT_UPLOAD_FILE_TIME_LOCK || 10000;

// Максимальный размер видео из x.com для скачивания на медиа-сервер (~100MB).
// Медиа-сервер грузит файл в память целиком; свой потолок у него теперь есть
// (download-and-save отвечает 413), но нам нужен предел строже и мягкая реакция:
// при превышении (или неизвестном размере) видео пропускается, ход создаётся
// с превью-картинкой и ссылкой.
const BOT_XCOM_VIDEO_MAX_FILE_SIZE =
  Number(process.env.BOT_XCOM_VIDEO_MAX_FILE_SIZE) || 100000000;

// Максимальный размер pdf-документа (~50MB — лимит медиа-сервиса для pdfs).
// Значение держим равным лимиту media: /pdfs/download-and-save свой потолок
// применяет (отвечает 413), но файл всё так же буферизует в памяти целиком,
// поэтому боту дешевле отсеять большой документ заранее, до скачивания.
const BOT_PDF_MAX_FILE_SIZE =
  Number(process.env.BOT_PDF_MAX_FILE_SIZE) || 50 * 1024 * 1024;

// Максимальный размер json-файла экспорта кодов игр для импорта
const BOT_IMPORT_FILE_MAX_SIZE =
  Number(process.env.BOT_IMPORT_FILE_MAX_SIZE) || 256 * 1024;

module.exports = {
  BOT_UPLOAD_DAILY_LIMIT,
  BOT_UPLOAD_FILE_TIME_LOCK,
  BOT_XCOM_VIDEO_MAX_FILE_SIZE,
  BOT_PDF_MAX_FILE_SIZE,
  BOT_IMPORT_FILE_MAX_SIZE,
};
