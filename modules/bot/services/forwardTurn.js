const fs = require('fs');
const { CLIENT_URL } = require('../../../config/url');
const {
  downloadImage,
  uploadImage,
  createTurn,
  downloadAudio,
  uploadAudio,
  createAudioTurn,
} = require('./telegram');
const Game = require('../../game/models/Game');
const { hashFunc } = require('../../game/services/security');
const {
  getUserInfo,
  STEP_MESSAGE_FORWARD,
  setUserInfo,
} = require('../lib/state');

const showGameButtons = async (bot, msg, { telegramUser }) => {
  const games = await Game.find({
    _id: { $in: telegramUser.games.map((g) => g.gameId) },
  });

  if (!games.length) {
    bot.sendMessage(msg.chat.id, 'You have no games saved. Enter game code:');
    return;
  }

  bot.sendMessage(msg.chat.id, 'Choose game to forward turn:', {
    reply_markup: {
      inline_keyboard: [
        ...games.map((g) => [
          { text: `${g.name}`, callback_data: `CHG_${g._id}` },
        ]),
        [{ text: `Other`, callback_data: `CHG_other` }],
      ],
    },
  });
};

const saveForwardedTurn = async (bot, msg, { telegramUser, gameId, token }) => {
  const userInfo = getUserInfo(telegramUser.userId);
  if (userInfo?.step !== STEP_MESSAGE_FORWARD) {
    bot.sendMessage(msg.chat.id, 'No turn to forward');
    return;
  }
  const turnData = {
    gameId,
    msg: userInfo.msg,
  };

  if (userInfo.msg.photo) {
    // добавляем картинку, если она есть в сообщении
    const file = await bot.getFile(
      userInfo.msg.photo[userInfo.msg.photo.length - 1].file_id
    );
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const downloadPath = await downloadImage(fileUrl);
    turnData.imageUrl = await uploadImage(downloadPath, telegramUser.hash);
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  } else if (userInfo.msg.audio) {
    const file = await bot.getFile(
      userInfo.msg.audio.file_id
    )
    
    const tgAudioUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    if (tgAudioUrl) {
      bot.sendMessage(msg.chat.id, 'Uploading audio...');
      const downloadAudioPath = await downloadAudio(tgAudioUrl);
      turnData.audioUrl = await uploadAudio(
        downloadAudioPath,
        telegramUser.hash
      );
      
      await createAudioTurn(turnData);
      const shortHash = hashFunc(gameId);
      bot.sendMessage(
        msg.chat.id,
        `New turn created. Follow the link:
    ${CLIENT_URL}/game?hash=${shortHash}`
      );
      setUserInfo(telegramUser.userId, null);
      return;
    } else {
      bot.sendMessage(
        msg.chat.id,
        'Error uploading audio. Please try again later.')
    }
    return;
  }
  await createTurn(turnData);
  const shortHash = hashFunc(gameId);
  bot.sendMessage(
    msg.chat.id,
    `New turn created. Follow the link:
    ${CLIENT_URL}/game?hash=${shortHash}`
  );
  setUserInfo(telegramUser.userId, null);
};

module.exports = {
  saveForwardedTurn,
  showGameButtons,
};
