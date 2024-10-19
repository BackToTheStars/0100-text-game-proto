// --- подключаем
// бота
// логирование
// стейт + объект пользователя

// saveForwardedTurn и кнопки игр
// выход из игры

// --- обработка команд
// /start отправьте код игры
// /forget_game кнопки EXG_*

// --- обработка сообщений
// forward_date, audio - remember STEP_MESSAGE_FORWARD и кнопки игр
// иначе
//    STEP_MESSAGE_FORWARD ?
//        saveGameCode (без сообщения), saveForwardedTurn
//        saveGameCode

// --- обработка кнопок
// CHG saveForwardedTurn или запрос нового
// EXG confirmToForgetGameCode
// EXGF forgetGameCode

require('dotenv').config();
require('./config/db');

const TelegramBot = require('node-telegram-bot-api');

const {
  addLog,
  TYPE_BOT_MESSAGE_ERROR,
  TYPE_BOT_QUERY_ERROR,
} = require('./modules/core/services/log');

const {
  getUserInfo,
  resetUserInfo,
  updateUserInfo,
  STEP_INIT,
  STEP_UPLOADING,
  STEP_MESSAGE_FORWARD,
} = require('./modules/bot/lib/state');

const {
  getUserByChatId,
  saveGameCode,
} = require('./modules/bot/services/authenticateUser');

const {
  createTurnByMessage,
  showGameButtons,
  isMessageToForward,
  createYoutubeTurnByMessage,
  isYoutubeUrl,
} = require('./modules/bot/services/forwardTurn');

const {
  MSG_WENT_WRONG,
  MSG_COMMAND_NOT_FOUND,
  MSG_SEND_GAME_CODE,
  MSG_NOT_AVAILABLE,
  MSG_SEND_CODE_OR_TURN,
  MSG_SEND_CODE_FIRST,
  MSG_SEND_TURN_FIRST,
} = require('./modules/bot/lib/messages');

const {
  showLogoutGameButtons,
  forgetGameCode,
  confirmToForgetGameCode,
} = require('./modules/bot/services/logoutGame');

const token = process.env.BOT_TOKEN;

const tgOptions = {}
if (process.env.BOT_MODE !== 'hook') {
  tgOptions.polling = true
}
if (process.env.BOT_BASE_API_URL) {
  tgOptions.baseApiUrl = process.env.BOT_BASE_API_URL
}

const bot = new TelegramBot(token, tgOptions);

bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramUser = await getUserByChatId(chatId);
    const userInfo = getUserInfo(chatId);

    // COMMANDS
    if (msg.text && msg.text.indexOf('/') === 0) {
      switch (msg.text) {
        case '/start':
          resetUserInfo(chatId);
          if (telegramUser.games.length === 0) {
            bot.sendMessage(chatId, MSG_SEND_GAME_CODE);
          } else {
            bot.sendMessage(chatId, MSG_SEND_CODE_OR_TURN);
          }
          break;
        case '/status':
          // for debug
          bot.sendMessage(
            chatId,
            `${userInfo.userId} ${userInfo.step} ${!!userInfo.msg}`
          );
          break;
        case '/forget_game':
          showLogoutGameButtons(bot, msg, { telegramUser });
          break;
        default:
          bot.sendMessage(chatId, MSG_COMMAND_NOT_FOUND);
      }
      return;
    }

    // MESSAGES
    if (userInfo.step === STEP_INIT) {
      // проверяем, что сообщение для РАЗМЕЩЕНИЯ ХОДА
      if (isMessageToForward(msg)) {
        if (telegramUser.games.length === 0) {
          bot.sendMessage(chatId, MSG_SEND_CODE_FIRST);
        } else {
          updateUserInfo(chatId, { step: STEP_MESSAGE_FORWARD, msg });
          showGameButtons(bot, msg, { telegramUser });
        }
        return;
      } else {
        // проверяем, что сообщение для ДОБАВЛЕНИЯ ИГРЫ
        await saveGameCode(bot, msg, { telegramUser });
        return;
      }
    } else if (userInfo.step === STEP_MESSAGE_FORWARD) {
      // выберите игру для публикации или начните заново
      if (isMessageToForward(msg)) {
        // обновляем информацию о сообщении для публикации
        updateUserInfo(chatId, { msg });
      }
      showGameButtons(bot, msg, { telegramUser });
      return;
    }
    bot.sendMessage(chatId, MSG_NOT_AVAILABLE);
  } catch (err) {
    console.log(err);
    resetUserInfo(msg.chat.id);
    addLog(TYPE_BOT_MESSAGE_ERROR, null, err);
    bot.sendMessage(msg.chat.id, MSG_WENT_WRONG);
  }
});

bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const telegramUser = await getUserByChatId(chatId);
    const userInfo = getUserInfo(chatId);

    const [prefix, params] = query.data.split('_');

    switch (prefix) {
      case 'CHG': {
        // CHange Game
        const gameId = params;
        if (userInfo.step !== STEP_MESSAGE_FORWARD) {
          bot.sendMessage(chatId, MSG_SEND_TURN_FIRST);
          return;
        }
        
        if (isYoutubeUrl(userInfo?.msg?.link_preview_options?.url)) {
          // without upload
          createYoutubeTurnByMessage(
            bot,
            query.message,
            {
              telegramUser,
              userInfo,
              gameId,
              token,
            },
            {
              doneStep: async (gameLink) => {
                bot.sendMessage(
                  chatId,
                  'New turn created. Follow the link:\n' + gameLink
                );
              },
              errorStep: async (text) => {
                resetUserInfo(chatId);
                bot.sendMessage(chatId, text);
              },
            }
          );
        } else {
          // with upload
          createTurnByMessage(
            bot,
            query.message,
            {
              telegramUser,
              userInfo,
              gameId,
              token,
            },
            {
              startStep: async () => {
                updateUserInfo(chatId, { step: STEP_UPLOADING });
                bot.sendMessage(chatId, 'Uploading...');
              },
              uploadingStep: async () => {
                bot.sendMessage(chatId, 'Saving...');
              },
              uploadedStep: async () => {
                resetUserInfo(chatId);
                bot.sendMessage(chatId, 'Done!');
              },
              doneStep: async (gameLink) => {
                bot.sendMessage(
                  chatId,
                  'New turn created. Follow the link:\n' + gameLink
                );
              },
              errorStep: async (text) => {
                resetUserInfo(chatId);
                bot.sendMessage(chatId, text);
              },
            }
          );
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
          bot.sendMessage(chatId, 'Cancelled.');
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
    resetUserInfo(msg.chat.id);
    addLog(TYPE_BOT_QUERY_ERROR, null, err);
    bot.sendMessage(msg.chat.id, MSG_WENT_WRONG);
  }
});

module.exports = bot;
