const Game = require("../models/Game")
const User = require("../models/User")

// @todo: заменить на кэширование
let games;

const hashFunc = (_id) => {
  // реализацию можно изменить в любой момент
  return (''+_id).slice(-3);
}

const getHashByGame = (game) => {
  return hashFunc(game._id);
}

const clearGamesCache = () => games = null;

const getInfo = async (hash) => {
  if(!games) {
    games = await Game.find(); // 
  }
  for (let game of games) {
    if (hashFunc(game._id) === hash) {
        const gameId = game._id;
        return {
          gameId,
          userId: User.ids.ADMIN_ID,
          rules: [User.rules.RULE_VIEW, User.rules.RULE_EDIT]
        }
    }
  }
  return {};
}

module.exports = {
  getInfo,
  getHashByGame,
  clearGamesCache
}


