const fs = require('fs');
const { CLIENT_URL } = require('../../../config/url');
const {
  downloadImage,
  uploadImage,
  createTurn,
} = require('../../../lib/telegram');
const Game = require('../../../models/Game');
const SecurityLayer = require('../../../services/SecurityLayer');

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
      keyboard: [games.map((g) => [`${g.name}`])],
    },
  });
};

const saveForwardedTurn = async (bot, msg, { telegramUser }) => {
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
};

module.exports = {
  saveForwardedTurn,
  showGameButtons,
};
