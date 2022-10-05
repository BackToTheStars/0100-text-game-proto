require('dotenv').config();
require('./models/db');
const { downloadImage, uploadImage, createTurn } = require('./lib/telegram');

const fs = require('fs');

const TelegramBot = require('node-telegram-bot-api');
const Game = require('./models/Game');
const Turn = require('./models/Turn');
const TelegramUser = require('./models/TelegramUser');
const SecurityLayer = require('./services/SecurityLayer');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const port = process.env.PORT || 3000;

// msg.chat.id и id пользователя в TG - одно и то же

// 1) Обработка start onText(/\/start/...
// Проверить, есть ли пользователь в БД, если нет, то создать
// Спросить у пользователя код игры

// 2) Пользователь пишет сообщение
// 2.0) Если пользователь написал /start, то ничего не делать
// 2.1) Если это форвард другого сообщения, то создать ход на бэкенде
// и отправить пользователью ссылку на игру
// 2.2) Иначе записать код игры для этого пользователя (в БД)
// и отправить пользователью, что всё ок

bot.onText(/\/start/, async (msg, match) => {
  // console.log(JSON.stringify(msg, null, 2));
  try {
    const chatId = msg.chat.id;

    let telegramUser = await TelegramUser.findOne({
      userId: chatId,
    });

    if (!telegramUser) {
      telegramUser = new TelegramUser({
        userId: chatId,
      });
      await telegramUser.save();
    }

    bot.sendMessage(chatId, 'Send game code');
  } catch (err) {
    console.log(err);
  }
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const resp = match[1];
    bot.sendMessage(chatId, resp);
  } catch (err) {
    console.log(err);
  }
});

bot.on('message', async (msg) => {
  try {
    //console.log(JSON.stringify(msg, null, 2));
    const chatId = msg.chat.id;

    let telegramUser = await TelegramUser.findOne({
      userId: chatId,
    });

    if (msg.text === '/start') {
      return;
    }

    if (msg.forward_date !== undefined && telegramUser.gameId === undefined) {
      bot.sendMessage(chatId, 'Send game code first');
      return;
    }

    if (msg.forward_date !== undefined) {
      if (msg.photo !== undefined) {
        const file = await bot.getFile(msg.photo[msg.photo.length - 1].file_id);
        //console.log(file.file_path);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        const downloadPath = await downloadImage(fileUrl);
        const imagePath = await uploadImage(downloadPath, telegramUser.hash);

        const data = {
          gameId: telegramUser.gameId,
          msg: msg,
          imagePath: imagePath,
        };

        await createTurn(data);

        if (fs.existsSync(downloadPath)) {
          fs.unlinkSync(downloadPath);
        }

        const shortHash = SecurityLayer.hashFunc(telegramUser.gameId);

        bot.sendMessage(chatId, 'New turn created');
        bot.sendMessage(chatId, `http://localhost:3002/game?hash=${shortHash}`);
        return;
      } else {
        const data = {
          gameId: telegramUser.gameId,
          msg: msg,
          imagePath: '',
        };

        await createTurn(data);

        const shortHash = SecurityLayer.hashFunc(telegramUser.gameId);

        bot.sendMessage(chatId, 'New turn created');
        bot.sendMessage(chatId, `http://localhost:3002/game?hash=${shortHash}`);

        return;
      }
    } else {
      const hash = msg.text;
      const game = await Game.findOne({
        'codes.hash': hash,
      });

      if (!game) {
        bot.sendMessage(chatId, 'Wrong code. Please send another game code');
        return;
      }

      let telegramUser = await TelegramUser.findOne({
        userId: chatId,
      });

      if (!telegramUser) {
        telegramUser = new TelegramUser({
          userId: chatId,
          gameId: game._id,
          hash: hash,
        });
        await telegramUser.save();
      } else {
        await telegramUser.updateOne({ gameId: game._id });
      }

      bot.sendMessage(chatId, 'Code saved. Now you can forward a message');

      //console.log(telegramUser);
    }
  } catch (err) {
    console.log(err);
  }
});
