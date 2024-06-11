const { ROLE_GAME_VISITOR } = require('../../../../config/game/user');
const Game = require('../../../game/models/Game');
const { getHashByGame } = require('../../../game/services/security');

const check = async () => {
  // get games without accessLevel
  const gamesWithoutAccessLevelCount = await Game.countDocuments({
    accessLevel: null,
  });
  // get public games with accessLevel not link
  const publicGamesWithAccessLevelNotLinkCount = await Game.countDocuments({
    public: true,
    accessLevel: { $ne: 'link' },
  });
  // get games with access level link without visitor code=hash
  const gamesWithAccessLevelLink = await Game.find({
    accessLevel: 'link',
  });
  let gamesWithAccessLevelLinkWithoutVisitorCodeHashCount = 0;
  for (const game of gamesWithAccessLevelLink) {
    let exists = false;
    const hash = getHashByGame(game);
    for (const code of game.codes) {
      if (code.role === ROLE_GAME_VISITOR && code.hash === hash) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      gamesWithAccessLevelLinkWithoutVisitorCodeHashCount++;
    }
  }
  // get games with access level code with visitor code=hash
  const gamesWithAccessLevelCode = await Game.find({
    accessLevel: 'code',
  });
  let gamesWithAccessLevelCodeWithVisitorCodeHashCount = 0;
  for (const game of gamesWithAccessLevelCode) {
    let exists = false;
    const hash = getHashByGame(game);
    for (const code of game.codes) {
      if (code.role === ROLE_GAME_VISITOR && code.hash === hash) {
        exists = true;
        break;
      }
    }
    if (exists) {
      gamesWithAccessLevelCodeWithVisitorCodeHashCount++;
    }
  }
  return [
    true,
    [
      `${gamesWithoutAccessLevelCount} games without accessLevel`,
      `${publicGamesWithAccessLevelNotLinkCount} public games with accessLevel not link`,
      `${gamesWithAccessLevelLinkWithoutVisitorCodeHashCount} games with access level link without visitor code=hash`,
      `${gamesWithAccessLevelCodeWithVisitorCodeHashCount} games with access level code with visitor code=hash`,
    ],
  ];
};

const run = async () => {
  // get games without accessLevel
  const gamesWithoutAccessLevel = await Game.find({
    accessLevel: null,
  });
  let accessLevelAddedCount = 0;
  for (const game of gamesWithoutAccessLevel) {
    game.accessLevel = 'link';
    await game.save();
    accessLevelAddedCount++;
  }

  // get public games with accessLevel not link
  const publicGamesWithAccessLevelNotLink = await Game.find({
    public: true,
    accessLevel: { $ne: 'link' },
  });
  let changedToAccessLinkCount = 0;
  for (const game of publicGamesWithAccessLevelNotLink) {
    game.accessLevel = 'link';
    await game.save();
    changedToAccessLinkCount++;
  }

  // get games with access level link without visitor code=hash
  const gamesWithAccessLevelLink = await Game.find({
    accessLevel: 'link',
  });
  let visitorCodeForLinkAdded = 0;
  for (const game of gamesWithAccessLevelLink) {
    let exists = false;
    const hash = getHashByGame(game);
    for (const code of game.codes) {
      if (code.role === ROLE_GAME_VISITOR && code.hash === hash) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      game.codes.push({ role: ROLE_GAME_VISITOR, hash: getHashByGame(game) });
      await game.save();
      visitorCodeForLinkAdded++;
    }
  }
  // get games with access level code with visitor code=hash
  const gamesWithAccessLevelCode = await Game.find({
    accessLevel: 'code',
  });
  let visitorCodeForLinkRemoved = 0;
  for (const game of gamesWithAccessLevelCode) {
    let exists = false;
    const hash = getHashByGame(game);
    const codes = [];
    for (const code of game.codes) {
      if (code.role === ROLE_GAME_VISITOR && code.hash === hash) {
        exists = true;
        break;
      } else {
        codes.push(code);
      }
    }
    if (exists) {
      game.codes = codes;
      await game.save();
      visitorCodeForLinkRemoved++;
    }
  }

  const messages = [];
  if (accessLevelAddedCount) {
    messages.push(`${accessLevelAddedCount} accessLevel added to games`);
  }
  if (changedToAccessLinkCount) {
    messages.push(
      `${changedToAccessLinkCount} public games with accessLevel not link changed to accessLevel link`
    );
  }
  if (visitorCodeForLinkAdded) {
    messages.push(
      `for ${visitorCodeForLinkAdded} games with access level link added code=hash`
    );
  }
  if (visitorCodeForLinkRemoved) {
    messages.push(
      `for ${visitorCodeForLinkRemoved} games with access level code removed visitor code=hash`
    );
  }
  return [true, messages];
};

module.exports = {
  check,
  run,
};
