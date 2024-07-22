require('dotenv').config();
require('./config/db');

const TelegramBot = require('node-telegram-bot-api');

const {
  addLog,
  TYPE_BOT_MESSAGE_ERROR,
  TYPE_BOT_QUERY_ERROR,
} = require('./modules/core/services/log');

const {
  setUserInfo,
  STEP_MESSAGE_FORWARD,
  getUserInfo,
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
const {
  showLogoutGameButtons,
  forgetGameCode,
  confirmToForgetGameCode,
} = require('./modules/bot/services/logoutGame');

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

bot.onText(/\/forget_game/, async (msg, match) => {
  try {
    const telegramUser = await getUserByChatId(msg.chat.id);
    showLogoutGameButtons(bot, msg, { telegramUser });
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

    // console.log({ msg });

    if (!msg.forward_date) {
      const userInfo = getUserInfo(telegramUser.userId);
      // если forward Turn существует,
      if (userInfo?.step === STEP_MESSAGE_FORWARD) {
        // то функция должна вернуть game при условии, что код корректный
        const game = await saveGameCode(bot, msg, {
          telegramUser,
          returnGameOnlyFlag: true,
        });
        if (!game) return;
        saveForwardedTurn(bot, msg, {
          telegramUser,
          gameId: game._id,
          token,
        });
      } else {
        await saveGameCode(bot, msg, { telegramUser });
      }
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
      case 'CHG': {
        // CHange Game
        if (params === 'other') {
          bot.sendMessage(chatId, 'Send game code');
        } else {
          const gameId = params;
          saveForwardedTurn(bot, query.message, {
            telegramUser,
            gameId,
            token,
          });
        }
        break;
      }
      case 'EXG': {
        // EXit Game
        const gameId = params;
        confirmToForgetGameCode(bot, query.message, {
          telegramUser,
          gameId,
        });
        break;
      }
      case 'EXGF': {
        // EXit Game Force
        if (params === 'CANCEL') {
          bot.sendMessage(query.message.chat.id, 'Cancelled.');
          return;
        }
        const gameId = params;
        forgetGameCode(bot, query.message, {
          telegramUser,
          gameId,
        });
        break;
      }
    }
  } catch (err) {
    console.log(err);
    addLog(TYPE_BOT_QUERY_ERROR, null, err);
    bot.sendMessage(query.message.chat.id, 'Something went wrong.');
  }
});

module.exports = bot;
