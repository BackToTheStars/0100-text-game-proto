// logger/logTypes.js
const LOG_TYPE = {
  USER_MESSAGE: 'user_message',         // Пользователь отправил сообщение
  USER_CALLBACK: 'user_callback',       // Пользователь нажал inline-кнопку (callback_query)
  BOT_REPLY: 'bot_reply',               // Бот отвечает пользователю
  XSTATE_TRANSITION: 'xstate_transition', // Переход состояния в xstate
  MSG_SERVICE_RUN: 'msg_service_run',   // (опционально) вызов run(command, args)
  ERROR: 'error'                        // (опционально) логи ошибок
};

const ALL_LOG_TYPES = Object.values(LOG_TYPE);

module.exports = {
  LOG_TYPE,
  ALL_LOG_TYPES,
};