const TelegramUser = require('../../../bot/models/TelegramUser');

const checkTgCodes = async () => {
  const users = await TelegramUser.find({
    games: { $exists: true, $ne: [] },
  });
  let usersWithDuplicates = 0;
  let duplicates = 0;

  for (const user of users) {
    let duplicateExists = false;
    const games = user.games;
    const dHashIds = {};
    for (const game of games) {
      const key = game.hash + '_' + game.gameId;
      console.log(key);
      if (dHashIds[key]) {
        duplicateExists = true;
        duplicates++;
      }

      dHashIds[key] = true;
    }

    if (duplicateExists) {
      usersWithDuplicates++;
    }
  }

  return [true, { usersWithDuplicates, duplicates }];
};

const removeTgCodesDuplicates = async () => {
  const users = await TelegramUser.find({
    games: { $exists: true, $ne: [] },
  });
  let usersWithDuplicates = 0;
  let duplicates = 0;

  for (const user of users) {
    let duplicateExists = false;
    const games = user.games;
    const dHashIds = {};
    const newGames = [];
    for (const game of games) {
      const key = game.hash + '_' + game.gameId;
      console.log(key);
      if (dHashIds[key]) {
        duplicateExists = true;
        duplicates++;
      } else {
        newGames.push(game);
      }

      dHashIds[key] = true;
    }

    if (duplicateExists) {
      usersWithDuplicates++;

      user.games = newGames;
      await user.save();
    }
  }

  return [
    true,
    `${usersWithDuplicates} users updated. ${duplicates} duplicates removed`,
  ];
};

module.exports = {
  checkTgCodes,
  removeTgCodesDuplicates,
};
