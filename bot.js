require('dotenv').config();
require('./models/db');

const TelegramBot = require('node-telegram-bot-api');

const { addLog, TYPE_BOT_MESSAGE_ERROR } = require('./lib/log');
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

    if (!telegramUser.gameId || !msg.forward_date) {
      // получаем код игры, без него дальше не пропускаем
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

module.exports = bot;
