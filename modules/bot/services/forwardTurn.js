const fs = require('fs');
const { CLIENT_URL } = require('../../../config/url');
const {
  downloadImage,
  uploadImage,
  createTurn,
  downloadAudio,
  uploadAudio,
  createAudioTurn,
  reverseDownloadAudio,
} = require('./telegram');
const Game = require('../../game/models/Game');
const { hashFunc } = require('../../game/services/security');

const { addLog, TYPE_BOT_FORWARD_ERROR } = require('../../core/services/log');

const BOT_UPLOAD_DAILY_LIMIT = process.env.BOT_UPLOAD_DAILY_LIMIT || 200000000; // ~200MB
const dailyUploaded = {};
const checkUpdateDaylyLimit = (volume) => {
  const date = new Date();
  const day = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
    -2
  )}-${('0' + date.getDate()).slice(-2)}`;
  if (!dailyUploaded[day]) {
    dailyUploaded[day] = 0;
  }
  if (dailyUploaded[day] + volume > BOT_UPLOAD_DAILY_LIMIT) {
    return false;
  }
  dailyUploaded[day] += volume;
  return true;
};

const showGameButtons = async (bot, msg, { telegramUser }) => {
  const games = await Game.find({
    _id: { $in: telegramUser.games.map((g) => g.gameId) },
  });

  if (!games.length) {
    bot.sendMessage(
      msg.chat.id,
      'You have no games saved. /start to Enter game code:'
    );
    return;
  }

  bot.sendMessage(
    msg.chat.id,
    'Choose game to forward turn or /start to forward another one:',
    {
      reply_markup: {
        inline_keyboard: [
          ...games.map((g) => [
            { text: `${g.name}`, callback_data: `CHG_${g._id}` },
          ]),
          // [{ text: `Other`, callback_data: `CHG_other` }],
        ],
      },
    }
  );
};

const createTurnByMessageOwnServer = async (
  bot,
  msg,
  { telegramUser, userInfo, gameId, token },
  {
    startStep = async () => {}, // start uploading
    uploadingStep = async () => {}, // save uploaded file
    uploadedStep = async () => {}, // file uploaded
    doneStep = async (gameLink) => {}, // turn created
    errorStep = async (text) => {}, // error
  }
) => {
  const stepsPast = [];
  try {
    if (userInfo.msg?.audio) {
      if (!checkUpdateDaylyLimit(userInfo.msg.audio.file_size)) {
        await errorStep('Daily upload limit exceeded');
        return;
      }
      await startStep();
      stepsPast.push('startStep');

      // получение файла сервером ботов
      const file = await bot.getFile(userInfo.msg.audio.file_id);
      await uploadingStep();
      stepsPast.push('uploadingStep');
      const resultFilePath = await fetch(
        `${process.env.BOT_STATIC_URL}/get-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file_path: file.file_path }),
        }
      );

      if (!resultFilePath.ok) {
        await errorStep('Error while uploading file');
        addLog(TYPE_BOT_FORWARD_ERROR, {
          step: 'uploadingStep',
          status: resultFilePath.status,
          statusText: resultFilePath.statusText,
        });
        return;
      }
      const { host_path } = await resultFilePath.json();
      const fileUrl = `${process.env.BOT_STATIC_URL}${host_path}`;

      // получение токена для обратной загрузки
      const audioUrl = await reverseDownloadAudio(fileUrl, telegramUser.hash);
      await uploadedStep();
      stepsPast.push('uploadedStep');
      await createAudioTurn({
        gameId,
        msg: userInfo.msg,
        audioUrl,
      });
      const shortHash = hashFunc(gameId);
      const gameLink = `${CLIENT_URL}/game?hash=${shortHash}`;
      await doneStep(gameLink);
    } else if (userInfo.msg?.photo) {
      if (!checkUpdateDaylyLimit(userInfo.msg.photo.at(-1).file_size)) {
        await errorStep('Daily upload limit exceeded');
        return;
      }
      await startStep();
      stepsPast.push('startStep');

      const file = await bot.getFile(userInfo.msg.photo.at(-1).file_id);
      await uploadingStep();
      stepsPast.push('uploadingStep');
      const resultFilePath = await fetch(`${process.env.BOT_STATIC_URL}/get-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: file.file_path }),
      });

      if (!resultFilePath.ok) {
        await errorStep('Error while uploading file');
        addLog(TYPE_BOT_FORWARD_ERROR, {
          step: 'uploadingStep',
          status: resultFilePath.status,
          statusText: resultFilePath.statusText,
        });
        return;
      }

      const { host_path } = await resultFilePath.json();
      const fileUrl = `${process.env.BOT_STATIC_URL}${host_path}`;
      const downloadPath = await downloadImage(fileUrl);
      
      const imageUrl = await uploadImage(downloadPath, telegramUser.hash);
      await uploadedStep();
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
      await createTurn({
        gameId,
        imageUrl,
        msg: userInfo.msg,
      });
      const shortHash = hashFunc(gameId);
      const gameLink = `${CLIENT_URL}/game?hash=${shortHash}`;
      await doneStep(gameLink);
    } else {
      errorStep('No message to forward');
    }
  } catch (error) {
    addLog(TYPE_BOT_FORWARD_ERROR, {
      step: 'unknown',
      code: error?.code,
      message: error?.message,
      stepsPast,
    });
    errorStep("Can't forward turn");
  }
};

const createTurnByMessageStandard = async (
  bot,
  msg,
  { telegramUser, userInfo, gameId, token },
  {
    startStep = async () => {}, // start uploading
    uploadingStep = async () => {}, // save uploaded file
    uploadedStep = async () => {}, // file uploaded
    doneStep = async (gameLink) => {}, // turn created
    errorStep = async (text) => {}, // error
  }
) => {
  try {
    if (userInfo.msg?.audio) {
      await startStep();
      const file = await bot.getFile(userInfo.msg.audio.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const downloadPath = await downloadAudio(fileUrl);
      await uploadingStep();
      const audioUrl = await uploadAudio(downloadPath, telegramUser.hash);
      await uploadedStep();
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
      await createAudioTurn({
        gameId,
        msg,
        audioUrl,
      });
      const shortHash = hashFunc(gameId);
      const gameLink = `${CLIENT_URL}/game?hash=${shortHash}`;
      await doneStep(gameLink);
    } else if (userInfo.msg?.photo) {
      await startStep();
      const file = await bot.getFile(userInfo.msg.photo.at(-1).file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const downloadPath = await downloadImage(fileUrl);
      await uploadingStep();
      const imageUrl = await uploadImage(downloadPath, telegramUser.hash);
      await uploadedStep();
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
      await createTurn({
        gameId,
        imageUrl,
        msg,
      });
      const shortHash = hashFunc(gameId);
      const gameLink = `${CLIENT_URL}/game?hash=${shortHash}`;
      await doneStep(gameLink);
    } else {
      errorStep('No message to forward');
    }
  } catch (error) {
    addLog(TYPE_BOT_FORWARD_ERROR, {
      code: error?.code,
      message: error?.message,
    });
    errorStep("Can't forward turn");
  }
};

const createTurnByMessage = process.env.BOT_BASE_API_URL
  ? createTurnByMessageOwnServer
  : createTurnByMessageStandard;

const isMessageToForward = (msg) => {
  return msg.forward_date || msg.audio;
};

module.exports = {
  createTurnByMessage,
  showGameButtons,
  isMessageToForward,
};
