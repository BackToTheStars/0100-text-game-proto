require('dotenv').config();
require('./models/db');
const { downloadImage, uploadImage, createTurn } = require('./lib/telegram');

const fs = require('fs');

const TelegramBot = require('node-telegram-bot-api');
const Game = require('./models/Game');
const TelegramUser = require('./models/TelegramUser');
const SecurityLayer = require('./services/SecurityLayer');
const { CLIENT_URL } = require('./config/url');

const token = process.env.BOT_TOKEN;
const bot =
  process.env.BOT_MODE === 'hook'
    ? new TelegramBot(token)
    : new TelegramBot(token, { polling: true });

const getUserByChatId = async (chatId) => {
  let telegramUser = await TelegramUser.findOne({
    userId: chatId,
  });

  if (!telegramUser) {
    telegramUser = new TelegramUser({
      userId: chatId,
    });
    await telegramUser.save();
  }

  return telegramUser;
};

bot.onText(/\/start/, async (msg, match) => {
  try {
    await getUserByChatId(msg.chat.id);
    bot.sendMessage(msg.chat.id, 'Send game code');
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

    if (!telegramUser.gameId) {
      // получаем код игры, без него дальше не пропускаем
      const game = await Game.findOne({
        'codes.hash': msg.text,
      });

      if (!game) {
        return bot.sendMessage(chatId, 'Wrong code. Please send correct one');
      }

      await telegramUser.updateOne({ gameId: game._id });
      return bot.sendMessage(
        chatId,
        'Code saved. Now you can forward a message'
      );
    }

    if (!msg.forward_date) {
      // сейчас обрабатываем только форварды
      return bot.sendMessage(
        chatId,
        'You can forward a message. No other messages available'
      );
    }

    const turnData = {
      gameId: telegramUser.gameId,
      msg: msg,
    };

    if (msg.photo) {
      // добавляем картинку, если она есть в сообщении
      const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      const downloadPath = await downloadImage(fileUrl);
      turnData.imageUrl = await uploadImage(downloadPath, telegramUser.hash);
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
    }
    await createTurn(turnData);
    const shortHash = SecurityLayer.hashFunc(telegramUser.gameId);
    bot.sendMessage(
      chatId,
      `New turn created. Follow the link:
      ${CLIENT_URL}/game?hash=${shortHash}`
    );
  } catch (err) {
    console.log(err);
    bot.sendMessage(msg.chat.id, 'Something went wrong.');
  }
});

module.exports = bot;
