// logger/index.js
const { createLogger, format, transports } = require('winston');
const { LOG_TYPE } = require('../../../config/logs');
require('winston-mongodb');

let currentMode = process.env.BOT_DEFAULT_LOG_MODE || 'error'; // значение по умолчанию

function setLoggerMode(mode) {
  currentMode = mode;
}

const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    // Вывод в консоль
    // new transports.Console(),
    new transports.MongoDB({
      db: process.env.MONGO_URL, // @todo: создать отдельное подключение?
      collection: 'bot_logs',
      level: 'info',
      // Можно ограничивать размер
      // capped: true, cappedMax: 100000,
    }),
  ],
});

function addLogInfo(type, chatId, logObject) {
  if (!['info'].includes(currentMode)) return;
  logger.info(JSON.stringify(logObject), { type, chatId });
}

function addLogError(type, chatId, logObject) {
  if (!['info', 'error'].includes(currentMode)) return;
  logger.error(JSON.stringify(logObject), { type, chatId });
}

// custom logs
const logBotReply = (
  chatId,
  { text, buttons = [], replyMessageId = null, answerCb = null }
) => {
  addLogInfo(LOG_TYPE.BOT_REPLY, chatId, {
    text,
    // buttons: buttons.map((b) => b.text),
    buttons,
    repliedTo: replyMessageId,
    // Можно хранить детальнее, если нужно
  });
};

const logUserMessage = (
  chatId,
  { message, isForward, mediaInfo, previewInfo }
) => {
  addLogInfo(LOG_TYPE.USER_MESSAGE, chatId, {
    text: message.text || '',
    messageId: message.message_id,
    mediaGroupId: message.media_group_id,
    isForward,
    mediaInfo,
    previewInfo,
    hasEntities: !!message.caption_entities || !!message.entities,
  });
};

const logUserCallback = (chatId, callbackQuery) => {
  addLogInfo(LOG_TYPE.USER_CALLBACK, chatId, {
    data: callbackQuery.data,
    messageId: callbackQuery.message.message_id,
  });
};

const logXstateTransition = (chatId, newState) => {
  addLogInfo(LOG_TYPE.XSTATE_TRANSITION, chatId, {
    newState,
  });
};

const logMsgServiceRun = (chatId, { command, args }) => {
  addLogInfo(LOG_TYPE.MSG_SERVICE_RUN, chatId, {
    command,
    args,
  });
};

module.exports = {
  setLoggerMode,
  addLogInfo,
  addLogError,
  // custom logs
  logBotReply,
  logUserMessage,
  logUserCallback,
  logXstateTransition,
  logMsgServiceRun,
};
