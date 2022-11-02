const { addLog, TYPE_BOT_GAME_CODE_ERROR } = require('../../../lib/log');
const Game = require('../../../models/Game');
const TelegramUser = require('../models/TelegramUser');

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

const start = async (bot, msg) => {
  await getUserByChatId(msg.chat.id);
  bot.sendMessage(msg.chat.id, 'Send game code');
};

// возвращает объект game или undefined
const saveGameCode = async (bot, msg, { telegramUser, returnGameOnlyFlag }) => {
  const chatId = msg.chat.id;

  const game = await Game.findOne({
    'codes.hash': msg.text,
  });

  if (!game) {
    addLog(TYPE_BOT_GAME_CODE_ERROR, { text: msg.text }, null);
    bot.sendMessage(chatId, 'Wrong code. Please send correct one');
    return;
  }

  const existingGames = telegramUser.games;

  const index = existingGames.findIndex((g) => g.gameId === game._id);

  if (index === -1) {
    existingGames.push({ gameId: game._id, hash: msg.text });
  } else {
    existingGames[index] = { gameId: game._id, hash: msg.text };
  }
  await telegramUser.updateOne({ games: existingGames });
  if (returnGameOnlyFlag) {
    return game;
  }
  bot.sendMessage(chatId, 'Code saved. Now you can forward a message');
  return;
};

module.exports = {
  getUserByChatId,
  start,
  saveGameCode,
};
