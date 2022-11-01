require('dotenv').config();
require('./models/db');

const TelegramBot = require('node-telegram-bot-api');

const {
  addLog,
  TYPE_BOT_MESSAGE_ERROR,
  TYPE_BOT_QUERY_ERROR,
} = require('./lib/log');
const {
  setUserInfo,
  STEP_MESSAGE_FORWARD,
} = require('./modules/bot/lib/state');
const {
  getUserByChatId,
  start,
  saveGameCode,
} = require('./modules/bot/services/authenticateUser');
const {
  saveForwardedTurn,
  sendGameButtons,
  showGameButtons,
} = require('./modules/bot/services/forwardTurn');

const token = process.env.BOT_TOKEN;
const bot =
  process.env.BOT_MODE === 'hook'
    ? new TelegramBot(token)
    : new TelegramBot(token, { polling: true });

bot.onText(/\/start/, async (msg, match) => {
  try {
    start(bot, msg);
  } catch (err) {
    console.log(err);
  }
});

bot.on('message', async (msg) => {
  try {
    if (msg.text && msg.text.indexOf('/') === 0) {
      // не обрабатываем здесь команды
      return;
    }

    const chatId = msg.chat.id;
    const telegramUser = await getUserByChatId(chatId);

    console.log({ msg });

    if (!msg.forward_date) {
      await saveGameCode(bot, msg, { telegramUser });
      return;
    }

    setUserInfo(chatId, { step: STEP_MESSAGE_FORWARD, msg });

    showGameButtons(bot, msg, { telegramUser });

    // saveForwardedTurn(bot, msg, { telegramUser });
  } catch (err) {
    console.log(err);
    addLog(TYPE_BOT_MESSAGE_ERROR, null, err);
    bot.sendMessage(msg.chat.id, 'Something went wrong.');
  }
});

bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const telegramUser = await getUserByChatId(chatId);

    const [prefix, params] = query.data.split('_');
    console.log({ prefix, params });

    switch (prefix) {
      case 'CHG': // CHange Game
        if (params === 'other') {
          bot.sendMessage(chatId, 'Send game code');
        } else {
          const gameId = params;
          saveForwardedTurn(bot, query.message, { telegramUser, gameId });
        }
        break;
    }
  } catch (err) {
    console.log(err);
    addLog(TYPE_BOT_QUERY_ERROR, null, err);
    bot.sendMessage(msg.chat.id, 'Something went wrong.');
  }
});

module.exports = bot;
