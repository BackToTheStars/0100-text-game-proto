require('dotenv').config();
require('./config/db');
const { Telegraf } = require('telegraf');
const {
  logBotReply,
  logUserMessage,
  logUserCallback,
} = require('./modules/bot/lib/logger');
const { getMessageService, COMMAND } = require('./modules/bot/lib/messageService');
const turnService = require('./modules/bot/lib/turnService');

const { LOG_TYPE } = require('./config/logs');
const { API_URL } = require('./config/url');

const token = process.env.BOT_TOKEN;
const customApiUrl = process.env.BOT_BASE_API_URL; // кастомный URL сервера
const botMode = process.env.BOT_MODE; // Режим работы бота: 'hook' или 'polling'
if (!token) throw new Error('BOT_TOKEN is required');

const bot = new Telegraf(token, {
  telegram: {
    apiRoot: customApiUrl || 'https://api.telegram.org', // Используем кастомный URL, если он задан
  },
});

turnService.setBot(bot);

const msgInfos = {};
const getMsgInfo = (chatId) => {
  if (!msgInfos[chatId]) {
    msgInfos[chatId] = {
      time: Date.now(),
      botMsgId: null,
      hasCb: false,
      prevMsgData: null,
      cbQueryCtx: null,
    };
  }
  return msgInfos[chatId];
};

const getDeps = (ctx) => {
  let timeoutId = null; // Идентификатор таймера
  let pendingMessage = null; // Сообщение, ожидающее отправки
  let isSending = false; // Флаг, указывающий, что сообщение отправляется

  return {
    showMessage: async ({
      text,
      buttons = [],
      replyMessageId = null,
      answerCb = null,
    }) => {
      // Отменяем предыдущий таймер, если он есть
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Сохраняем новое сообщение в очередь
      pendingMessage = {
        text,
        buttons,
        replyMessageId,
        answerCb,
      };

      // Если сообщение уже отправляется, просто обновляем очередь
      if (isSending) {
        return;
      }

      // Устанавливаем таймер на 300 мс
      timeoutId = setTimeout(async () => {
        isSending = true; // Устанавливаем флаг отправки

        try {
          logBotReply(ctx.chat?.id, {
            type: LOG_TYPE.BOT_REPLY,
            text,
            buttons,
            replyMessageId,
            answerCb,
          });
          const msgInfo = ctx.msgInfo;
          const extra = {
            parse_mode: 'MarkdownV2',
          };
          let currentMsgUpdated = false;

          if (pendingMessage.buttons.length > 0) {
            extra.reply_markup = {
              inline_keyboard: pendingMessage.buttons.map((button) => [button]),
            };
          }

          // отдельный случай - удаление reply_to_message_id вместе с самим сообщением, так как иначе обновить сообщение не получится
          if (
            msgInfo.prevMsgData?.replyMessageId &&
            !pendingMessage.replyMessageId
          ) {
            try {
              await bot.telegram.deleteMessage(ctx.chat.id, msgInfo.botMsgId);
              msgInfo.botMsgId = null;
            } catch (error) {
              console.log(error);
            }
          }

          if (msgInfo.botMsgId) {
            const toChangeText =
              pendingMessage.text !== msgInfo.prevMsgData?.text;
            const toChangeButtons =
              JSON.stringify(pendingMessage.buttons) !==
              JSON.stringify(msgInfo.prevMsgData?.buttons);
            const toChangeReplyMessageId =
              pendingMessage.replyMessageId !==
              msgInfo.prevMsgData?.replyMessageId;

            if (toChangeText || toChangeButtons || toChangeReplyMessageId) {
              currentMsgUpdated = true;
              await bot.telegram.editMessageText(
                ctx.chat.id,
                msgInfo.botMsgId,
                undefined,
                pendingMessage.text,
                extra
              );
            }
          } else {
            if (pendingMessage.replyMessageId) {
              extra.reply_to_message_id = pendingMessage.replyMessageId;
            }
            const msg = await ctx.reply(pendingMessage.text, extra);
            msgInfo.botMsgId = msg.message_id;
          }

          if (
            msgInfo.cbQueryCtx &&
            !currentMsgUpdated &&
            msgInfo.botMsgId &&
            msgInfo.hasCb &&
            pendingMessage.answerCb
          ) {
            await msgInfo.cbQueryCtx.answerCbQuery(pendingMessage.answerCb);
          }

          msgInfo.hasCb = pendingMessage.buttons.length > 0;
          msgInfo.prevMsgData = {
            text: pendingMessage.text,
            buttons: pendingMessage.buttons,
            replyMessageId: pendingMessage.replyMessageId,
          };
        } catch (error) {
          console.log(error);
          await bot.telegram.sendMessage(ctx.chat.id, 'Something went wrong');
        } finally {
          isSending = false; // Сбрасываем флаг отправки
          pendingMessage = null; // Очищаем очередь

          // Если в очереди есть новое сообщение, запускаем его обработку
          if (pendingMessage) {
            timeoutId = setTimeout(async () => {
              await getDeps(ctx).showMessage(pendingMessage);
            }, 300);
          }
        }
      }, 300);
    },
    getTurnService: () => turnService
  };
};

bot.use(async (ctx, next) => {
  ctx.msgInfo = getMsgInfo(ctx.chat.id);
  ctx.messageService = await getMessageService(ctx.chat.id, getDeps(ctx));
  return next();
});

bot.use(async (ctx, next) => {
  try {
    // Логируем update
    if (ctx.updateType === 'message') {
      const { message } = ctx.update;
      logUserMessage(message.chat.id, {
        message,
        isForward: turnService.isForward(message),
        mediaInfo: turnService.getMediaInfo(message),
        previewInfo: turnService.getPreviewInfo(message),
      });
    } else if (ctx.updateType === 'callback_query') {
      const { callback_query } = ctx.update;
      logUserCallback(callback_query.message.chat.id, callback_query);
    }
  } catch (err) {
    console.error('Logging error (bot.use):', err);
  }
  return next();
});

const mediaGroups = {}; // Хранилище для отслеживания медиагрупп

bot.on('message', async (ctx) => {
  const { messageService, msgInfo } = ctx;
  msgInfo.hasCb = false;

  if (msgInfo.botMsgId) {
    try {
      await ctx.deleteMessage(msgInfo.botMsgId);
    } catch (error) {
      // @todo: log error
    }
    msgInfo.botMsgId = null;
  }

  let command = COMMAND.UNKNOWN;
  const args = {};

  const text = ctx.message.text || '';
  if (text.startsWith('/')) {
    command = ctx.message.text.slice(1);
  } else if (
    turnService.isForward(ctx.message) ||
    turnService.hasMedia(ctx.message) ||
    turnService.getPreviewInfo(ctx.message)
  ) {
    // Проверяем, является ли сообщение частью медиагруппы
    if (ctx.message.media_group_id) {
      const mediaGroupId = ctx.message.media_group_id;

      // Инициализируем массив для медиагруппы, если он ещё не создан
      if (!mediaGroups[mediaGroupId]) {
        mediaGroups[mediaGroupId] = {
          messages: [],
          timeout: null,
        };
      }

      // Добавляем текущее сообщение в массив
      mediaGroups[mediaGroupId].messages.push(ctx.message);

      // Если таймер уже запущен, не создаем новый
      if (!mediaGroups[mediaGroupId].timeout) {
        mediaGroups[mediaGroupId].timeout = setTimeout(async () => {
          // Обработка медиагруппы после завершения ожидания
          const messages = mediaGroups[mediaGroupId].messages;

          // Ищем сообщение с caption
          const messageWithCaption = messages.find((msg) => msg.caption);
          const targetMessage = messageWithCaption || messages[0];

          // Устанавливаем команду и аргументы
          command = COMMAND.SETUP_TURN_CREATION_MSG;
          args.msg = targetMessage;

          // Запускаем обработку
          await messageService.run(command, args);

          // Удаляем медиагруппу из хранилища
          delete mediaGroups[mediaGroupId];
        }, 1000); // Ожидание 1000 мс
      }

      return; // Прерываем выполнение, чтобы не обрабатывать сообщение сразу
    }

    command = COMMAND.SETUP_TURN_CREATION_MSG;
    args.msg = ctx.message;
  } else {
    args.text = ctx.message.text;
    command = COMMAND.TEXT;
  }

  await messageService.run(command, args);
});

// Обработка callback_query
bot.on('callback_query', async (ctx) => {
  try {
    const { messageService, msgInfo } = ctx;
    msgInfo.cbQueryCtx = ctx;

    if (
      !msgInfo.botMsgId ||
      msgInfo.botMsgId !== ctx.callbackQuery.message.message_id
    ) {
      ctx.answerCbQuery('Message is outdated. Please, use the new one.');
      return;
    }

    const [command, strArgs] = ctx.callbackQuery.data.split('---');
    const args = strArgs ? JSON.parse(strArgs) : {};
    await messageService.run(command, args);
  } catch (error) {
    console.log(error);
    await bot.telegram.sendMessage(ctx.chat.id, 'Something went wrong');
  }
});

bot.catch((err, ctx) => {
  // @todo: log
  console.log(err);
});

// Запуск бота
// Запуск бота в зависимости от режима
if (botMode === 'hook') {
  // Режим вебхука (нужно настроить вебхук отдельно)
  bot.launch({
    webhook: {
      domain: API_URL,
      path: '/bot' + token,
    },
  });
} else {
  // Режим polling (по умолчанию)
  bot.launch({
    polling: true,
  });
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;