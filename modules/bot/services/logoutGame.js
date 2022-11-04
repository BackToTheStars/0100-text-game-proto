const Game = require('../../../models/Game');

const confirmToForgetGameCode = async (bot, msg, { telegramUser, gameId }) => {
  const existingGames = telegramUser.games;

  const gameToForget = existingGames.find(
    (g) => g.gameId.toString() === gameId
  );

  if (!gameToForget) {
    bot.sendMessage(msg.chat.id, `No such game found.`);
    return;
  }

  const gameToForgetModel = await Game.findById(gameId);

  bot.sendMessage(msg.chat.id, 'Confirm:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `Forget "${gameToForgetModel.name}"`,
            callback_data: `EXGF_${gameId}`,
          },
          { text: `Cancel`, callback_data: `EXGF_CANCEL` },
        ],
      ],
    },
  });
};

const forgetGameCode = async (bot, msg, { telegramUser, gameId }) => {
  const existingGames = telegramUser.games;

  const gameToForget = existingGames.find(
    (g) => g.gameId.toString() === gameId
  );

  if (!gameToForget) {
    bot.sendMessage(msg.chat.id, `No such game found.`);
    return;
  }

  await telegramUser.updateOne({
    games: existingGames.filter((g) => g.gameId.toString() !== gameId),
  });
  const game = await Game.findById(gameId);
  bot.sendMessage(msg.chat.id, `Forgot game "${game.name}"`);
};

const showLogoutGameButtons = async (bot, msg, { telegramUser }) => {
  const games = await Game.find({
    _id: { $in: telegramUser.games.map((g) => g.gameId) },
  });

  if (!games.length) {
    bot.sendMessage(msg.chat.id, 'You have no games saved. Nothing to exit.');
    return;
  }

  bot.sendMessage(msg.chat.id, 'Choose game to forget:', {
    reply_markup: {
      inline_keyboard: [
        ...games.map((g) => [
          { text: `${g.name}`, callback_data: `EXG_${g._id}` },
        ]),
      ],
    },
  });
};

module.exports = {
  showLogoutGameButtons,
  forgetGameCode,
  confirmToForgetGameCode,
};
