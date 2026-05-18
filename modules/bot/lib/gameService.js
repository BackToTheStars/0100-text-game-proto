const TelegramUser = require('../models/TelegramUser');
const Game = require('../../game/models/Game');
const Turn = require('../../game/models/Turn');
const { fromPromise } = require('xstate');
const { hasRule, RULE_TURNS_CRUD } = require('../../../config/game/user');

class GameService {
  userId = null;
  user = null;
  games = [];
  inited = false;

  constructor(userId) {
    this.userId = userId;
  }

  async init() {
    if (this.inited) return;
    this.user = await TelegramUser.findOne({
      userId: this.userId,
    });
    if (!this.user) {
      this.user = new TelegramUser({
        userId: this.userId,
      });
      await this.user.save();
    }
    await this.reloadGames();
    this.inited = true;
  }

  async reloadGames() {
    const dIdCodes = this.user.games.reduce(
      (acc, game) => ({
        ...acc,
        [game.gameId]: game.hash,
      }),
      {}
    );
    const games = await Game.find(
      {
        _id: {
          $in: Object.keys(dIdCodes),
        },
      },
      {
        name: 1,
        description: 1,
      }
    ).lean();
    this.games = games.map((game) => ({
      ...game,
      code: dIdCodes[String(game._id)],
    }));
  }

  // Аналогично добавлению, но по сути "обратное" действие
  async removeGameByHash(code) {
    try {
      const prevCount = this.user.games.length;

      // Удаляем из массива user.games все записи с нужным hash
      this.user.games = this.user.games.filter((g) => g.hash !== code);

      if (prevCount === this.user.games.length) {
        // Игра не была найдена
        return [false, `Game with code ${code} not found in your list`];
      }

      // Сохраняем и перезагружаем локальный кэш
      await this.user.save();
      await this.reloadGames();

      return [true, `Forgot game ${code}`];
    } catch (err) {
      // @todo: log
      console.log(err);
      return [false, 'Error while removing game'];
    }
  }

  async addGameByHash(code) {
    try {
      const game = await Game.findOne({
        'codes.hash': code,
      });

      if (!game) {
        return [false, 'Game not found'];
      }
      if (this.user.games.find((g) => String(g.gameId) === String(game._id))) {
        return [false, `Game ${game.name} already added`];
      }

      // проверяем роль
      const chosenCode = game.codes.find((c) => c.hash === code);
      if (!hasRule(chosenCode.role, RULE_TURNS_CRUD)) {
        return [
          false,
          `Game code ${code} does not have role for turn management`,
        ];
      }

      const gameToAdd = {
        gameId: game._id,
        name: game.name,
        description: game.description,
        code,
      };
      this.user.games.push({
        gameId: game._id,
        hash: code,
      });
      await this.user.save();
      await this.reloadGames();
      return [true, `Game ${game.name} added`, gameToAdd];
    } catch (err) {
      console.log(err);
      return [false, 'Error while adding game'];
    }
  }

  async creatTurn(turnData, turnGameCode) {
    try {
      const game = this.games.find((g) => g.code === turnGameCode);
      const lastTurn = await Turn.findOne({
        gameId: game._id,
      }).sort({ createdAt: 'desc' });

      const { x = 0, y = 0, width = 0 } = lastTurn || {};
      const turn = new Turn({
        ...turnData,
        gameId: game._id,
        x: x + width + 50,
        y,
      });
      await turn.save();
      return [true, `Turn has been created`];
    } catch (err) {
      console.log(err);
      return [false, 'Error while creating turn'];
    }
  }
}

// Храним инстансы сервиса на пользователя
const gameServices = {};
const getGameService = (userId) => {
  if (!gameServices[userId]) {
    gameServices[userId] = new GameService(userId);
  }
  return gameServices[userId];
};

// Актор для добавления игры (уже был)
const doAddGame = fromPromise(async ({ input }) => {
  const { userId, codeToAdd, deps } = input;
  return new Promise(async (resolve, reject) => {
    try {
      const gameService = getGameService(userId);
      const [success, msg, game] = await gameService.addGameByHash(codeToAdd);
      if (success) {
        deps.setInfo(msg);
        resolve({
          msg,
          game,
        });
      } else {
        deps.setError(msg);
        reject(msg);
      }
    } catch (err) {
      console.log(err);
      deps.setError(err.message);
      reject(err.message);
    }
  });
});

// >>> НОВЫЙ актор, аналогично doAddGame, но для удаления игры <<<
const doRemoveGame = fromPromise(async ({ input }) => {
  const { userId, codeToRemove, deps } = input;

  return new Promise(async (resolve, reject) => {
    const gameService = getGameService(userId);
    const [success, msg] = await gameService.removeGameByHash(codeToRemove);
    if (success) {
      deps.setInfo(msg);
      resolve({ msg, codeToRemove });
    } else {
      deps.setError(msg);
      reject(msg);
    }
  });
});

const doCreateTurn = fromPromise(async ({ input }) => {
  const { userId, deps, turnData, turnGameCode } = input;
  return new Promise(async (resolve, reject) => {
    try {
      const gameService = getGameService(userId);
      const [success, msg] = await gameService.creatTurn(turnData, turnGameCode);
      if (success) {
        return resolve({
          msg,
        });
      } else {
        deps.setError(msg);
        reject(msg);
      }
    } catch (err) {
      console.log(err);
      deps.setError(err.message);
      reject(err.message);
    }
  });
});

module.exports = {
  getGameService,
  doAddGame,
  doRemoveGame,
  doCreateTurn,
};
