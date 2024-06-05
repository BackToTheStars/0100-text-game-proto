const Log = require('../models/Log');

const TYPE_BOT_MESSAGE_ERROR = 'bot-message-error';
const TYPE_BOT_GAME_CODE_ERROR = 'bot-game-code-error';
const TYPE_BOT_QUERY_ERROR = 'bot-query-error';

const addLog = async (logType, params, info) => {
  const log = new Log({ logType, params, info });
  await log.save();
};

module.exports = {
  addLog,
  TYPE_BOT_MESSAGE_ERROR,
  TYPE_BOT_GAME_CODE_ERROR,
  TYPE_BOT_QUERY_ERROR,
};
