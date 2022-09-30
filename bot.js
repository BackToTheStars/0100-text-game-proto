require('dotenv').config();
require('./models/db');
const { getToken } = require('./lib/game');

const https = require('https');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const TelegramBot = require('node-telegram-bot-api');
const Game = require('./models/Game');
const Turn = require('./models/Turn');
const TelegramUser = require('./models/TelegramUser');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

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
    //const resp = match[1];
    //bot.sendMessage(chatId, resp);

    let telegramUser = await TelegramUser.findOne({
      userId: chatId,
    });

    if (!telegramUser) {
      telegramUser = new TelegramUser({
        userId: user_id,
        gameId: '',
        hash: '',
      });
      await telegramUser.save();
    }

    bot.sendMessage(chatId, 'Send game code');

    console.log(telegramUser);
  } catch (err) {
    console.log(err);
  }
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  // console.log(JSON.stringify(msg, null, 2));
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
    console.log(JSON.stringify(msg, null, 2));

    const chatId = msg.chat.id;

    if (msg.text === '/start') {
      return;
    }

    if (msg.forward_date !== undefined) {
      let telegramUser = await TelegramUser.findOne({
        userId: chatId,
      });

      if (msg.photo !== undefined) {
        const file = await bot.getFile(msg.photo[2].file_id);
        //console.log(file.file_path);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        https.get(fileUrl, (resp) =>
          resp.pipe(fs.createWriteStream('file.jpg'))
        );

        const data = new FormData();
        data.append('file', fs.createReadStream('file.jpg'));

        const tokenStaticServer = getToken(
          process.env.JWT_SECRET_STATIC,
          'upload',
          new Date().getTime() + 5 * 60 * 1000,
          telegramUser.hash
        );

        const config = {
          method: 'post',
          url: 'http://localhost:3003/images/upload',
          headers: {
            Authorization: 'Bearer ' + tokenStaticServer,
            ...data.getHeaders(),
          },
          data: data,
        };

        let imagePath = '';

        await axios(config)
          .then(function (response) {
            //console.log(JSON.stringify(response.data));
            imagePath = response.data.src;
            //console.log(imagePath);
          })
          .catch(function (error) {
            console.log(error);
          });

        const lastTurn = await Turn.findOne({
          gameId: telegramUser.gameId,
          contentType: { $ne: 'zero-point' },
        }).sort({ createdAt: 'desc' });

        const newTurn = new Turn({
          gameId: telegramUser.gameId,
          width: 800,
          height: 600,
          contentType: 'picture',
          imageUrl: imagePath,
          paragraph: [
            {
              insert: msg.caption,
            },
          ],
          x: lastTurn.x + 50,
          y: lastTurn.y + 0,
          dontShowHeader: true,
        });
        await newTurn.save();

        bot.sendMessage(chatId, 'New turn created');
        return;
      } else {
        const lastTurn = await Turn.findOne({
          gameId: telegramUser.gameId,
          contentType: { $ne: 'zero-point' },
        }).sort({ createdAt: 'desc' });

        const newTurn = new Turn({
          gameId: telegramUser.gameId,
          width: 800,
          height: 600,
          contentType: 'text',
          paragraph: [
            {
              insert: msg.text,
            },
          ],
          x: lastTurn.x + 50,
          y: lastTurn.y + 0,
          dontShowHeader: true,
        });
        await newTurn.save();

        bot.sendMessage(chatId, 'New turn created');
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
          userId: user_id,
          gameId: game._id,
          hash: hash,
        });
        await telegramUser.save();
      } else {
        await telegramUser.updateOne({ gameId: game._id });
      }

      bot.sendMessage(chatId, 'Code saved. Now you can forward a message');

      console.log(telegramUser);
    }
  } catch (err) {
    console.log(err);
  }
});
