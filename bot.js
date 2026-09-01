require('dotenv').config();
require('./config/db');
const { Telegraf } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');
const {
  logBotReply,
  logUserMessage,
  logUserCallback,
} = require('./modules/bot/lib/logger');
const {
  getMessageService,
  COMMAND,
} = require('./modules/bot/lib/messageService');
const turnService = require('./modules/bot/lib/turnService');

const { LOG_TYPE } = require('./config/logs');

const token = process.env.BOT_TOKEN;
const customApiUrl = process.env.BOT_BASE_API_URL; // кастомный URL сервера
const botMode = process.env.BOT_MODE; // Режим работы бота: 'hook' или 'polling'
const proxyUrl = process.env.BOT_PROXY_URL; // Прокси для локальной разработки

if (!token) throw new Error('BOT_TOKEN is required');

const buildAgent = () => {
  if (customApiUrl)
    return {
      telegram: {
        apiRoot: customApiUrl,
      },
    };
  if (proxyUrl)
    return {
      telegram: {
        agent: new HttpsProxyAgent(proxyUrl),
      },
    };
  return undefined;
};

const bot = new Telegraf(
  token,
  buildAgent(),
);

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

  // Отправляет накопленное pendingMessage; если за время отправки пришло
  // новое сообщение — досылает его следом (см. finally)
  const sendPending = async () => {
    const toSend = pendingMessage;
    pendingMessage = null;
    if (!toSend) {
      return;
    }
    isSending = true; // Устанавливаем флаг отправки

    try {
      logBotReply(ctx.chat?.id, {
        type: LOG_TYPE.BOT_REPLY,
        text: toSend.text,
        buttons: toSend.buttons,
        replyMessageId: toSend.replyMessageId,
        answerCb: toSend.answerCb,
      });
      const msgInfo = ctx.msgInfo;
      const extra = {
        parse_mode: 'MarkdownV2',
      };
      let currentMsgUpdated = false;

      if (toSend.buttons.length > 0) {
        extra.reply_markup = {
          inline_keyboard: toSend.buttons.map((button) => [button]),
        };
      }

      // отдельный случай - удаление reply_to_message_id вместе с самим сообщением, так как иначе обновить сообщение не получится
      if (msgInfo.prevMsgData?.replyMessageId && !toSend.replyMessageId) {
        try {
          await bot.telegram.deleteMessage(ctx.chat.id, msgInfo.botMsgId);
          msgInfo.botMsgId = null;
        } catch (error) {
          console.log(error);
        }
      }

      if (msgInfo.botMsgId) {
        const toChangeText = toSend.text !== msgInfo.prevMsgData?.text;
        const toChangeButtons =
          JSON.stringify(toSend.buttons) !==
          JSON.stringify(msgInfo.prevMsgData?.buttons);
        const toChangeReplyMessageId =
          toSend.replyMessageId !== msgInfo.prevMsgData?.replyMessageId;

        if (toChangeText || toChangeButtons || toChangeReplyMessageId) {
          currentMsgUpdated = true;
          await bot.telegram.editMessageText(
            ctx.chat.id,
            msgInfo.botMsgId,
            undefined,
            toSend.text,
            extra,
          );
        }
      } else {
        if (toSend.replyMessageId) {
          // Bot API >= 7.0: reply_to_message_id заменён на reply_parameters
          extra.reply_parameters = {
            message_id: toSend.replyMessageId,
            allow_sending_without_reply: true,
          };
        }
        const msg = await ctx.reply(toSend.text, extra);
        msgInfo.botMsgId = msg.message_id;
      }

      if (
        msgInfo.cbQueryCtx &&
        !currentMsgUpdated &&
        msgInfo.botMsgId &&
        msgInfo.hasCb &&
        toSend.answerCb
      ) {
        await msgInfo.cbQueryCtx.answerCbQuery(toSend.answerCb);
      }

      msgInfo.hasCb = toSend.buttons.length > 0;
      msgInfo.prevMsgData = {
        text: toSend.text,
        buttons: toSend.buttons,
        replyMessageId: toSend.replyMessageId,
      };
    } catch (error) {
      console.log(error);
      try {
        await bot.telegram.sendMessage(ctx.chat.id, 'Something went wrong');
      } catch (sendError) {
        console.log(sendError);
      }
    } finally {
      isSending = false; // Сбрасываем флаг отправки

      // Если за время отправки в очередь попало новое сообщение — досылаем его
      if (pendingMessage) {
        timeoutId = setTimeout(sendPending, 300);
      }
    }
  };

  return {
    showMessage: async ({
      text,
      buttons = [],
      replyMessageId = null,
      answerCb = null,
    }) => {
      // Сохраняем новое сообщение в очередь (храним только последнее)
      pendingMessage = {
        text,
        buttons,
        replyMessageId,
        answerCb,
      };

      // Если сообщение уже отправляется — sendPending дошлёт очередь сам
      if (isSending) {
        return;
      }

      // Откладываем отправку на 300 мс, сбрасывая предыдущий таймер
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      timeoutId = setTimeout(sendPending, 300);
    },
    // Отправка файла (например, экспорт кодов игр). Документ — отдельное
    // сообщение; старое меню удаляем, чтобы новое меню оказалось ниже файла
    sendDocument: async ({ filename, buffer, caption }) => {
      const msgInfo = ctx.msgInfo;
      if (msgInfo.botMsgId) {
        try {
          await bot.telegram.deleteMessage(ctx.chat.id, msgInfo.botMsgId);
        } catch (error) {
          console.log(error);
        }
        msgInfo.botMsgId = null;
        msgInfo.prevMsgData = null;
      }
      await bot.telegram.sendDocument(
        ctx.chat.id,
        { source: buffer, filename },
        caption ? { caption } : undefined
      );
    },
    getTurnService: () => turnService,
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
  } else if (turnService.isJsonDocument(ctx.message)) {
    // json-файл экспорта кодов игр — импорт (в том числе форвард файла)
    command = COMMAND.IMPORT_GAMES_FILE;
    args.msg = ctx.message;
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

// Запуск.
// - polling: bot.js запущен как отдельный процесс (`node bot.js` / `npm run bot`) →
//   long-polling стартует здесь. Именно так работает связка этапов 3–4 через локальный
//   telegram-bot-api (см. brain-platform/docs/deploy/3-4-alternative.md) — webhook не нужен.
// - hook:   webhook монтирует и регистрирует server.js (bot.js в этом случае лишь
//   импортируется ради экземпляра bot). Здесь НИЧЕГО не запускаем, иначе Telegraf
//   поднимет второй HTTP-listener и вызовет setWebhook сам (баг двойного запуска).
if (require.main === module) {
  if (botMode === 'hook') {
    console.warn(
      'BOT_MODE=hook: вебхук обслуживает server.js — отдельный процесс bot.js не нужен, выходим.'
    );
    process.exit(0);
  }
  bot.launch();
  console.log(
    `Bot started (long-polling); apiRoot: ${customApiUrl || 'https://api.telegram.org'}`
  );
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
