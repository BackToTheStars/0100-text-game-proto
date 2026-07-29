const { createMachine, createActor, assign } = require('xstate');
const { doAddGame, doRemoveGame, getGameService, doCreateTurn } = require('./gameService');

const COMMAND = {
  ADD_GAME: 'add_game',
  REMOVE_GAME: 'remove_game',
  CREATE_TURN: 'create_turn',
  COMPLETE_TURN_CREATION: 'complete_turn_creation',
};

const machine = createMachine(
  {
    id: 'gameMachine',
    initial: 'chooseState',
    context: ({ input }) => ({
      userId: input.userId,
      games: input?.games || [],
      deps: input?.deps,

      codeToAdd: null,
      codeToRemove: null,

      // Для хранения данных о создаваемом ходе
      turnData: null,
      turnGameCode: null,
    }),
    states: {
      chooseState: {
        always: [
          { target: 'with_games', guard: 'hasGames' },
          { target: 'init' },
        ],
      },
      init: {
        // without games
        on: {
          [COMMAND.ADD_GAME]: {
            target: 'adding_game',
            actions: 'addGameSetup',
          },
        },
      },
      with_games: {
        on: {
          [COMMAND.ADD_GAME]: {
            target: 'adding_game',
            actions: 'addGameSetup',
          },
          [COMMAND.REMOVE_GAME]: {
            // раньше тут было: target: 'removing_game',
            // теперь делаем invoke
            target: 'removing_game',
            actions: 'removeGameSetup', // см. action ниже
          },
          [COMMAND.CREATE_TURN]: {
            target: 'creating_turn',
            actions: 'setupCreatingTurn',
          },
        },
      },
      adding_game: {
        tags: ['busy'],
        invoke: {
          src: 'doAddGame',
          input: ({ context }) => context,
          onDone: {
            target: 'games_are_changed',
            actions: 'onAddGameSuccess',
          },
          onError: {
            target: 'games_are_changed',
            actions: 'onAddGameError',
          },
        },
      },
      removing_game: {
        tags: ['busy'],
        invoke: {
          src: 'doRemoveGame',
          input: ({ context }) => context,
          onDone: {
            target: 'games_are_changed',
            actions: 'onRemoveGameSuccess',
          },
          onError: {
            target: 'games_are_changed',
            actions: 'onRemoveGameError',
          },
        },
      },

      creating_turn: {
        tags: ['busy'],
        invoke: {
          // Здесь вызывается асинхронная операция по созданию хода
          src: 'doCreateTurn',
          input: ({ context }) => context,
          onDone: {
            target: 'with_games',
            actions: 'onCreateTurnSuccess',
          },
          onError: {
            target: 'with_games',
            actions: 'onCreateTurnError',
          },
        },
      },

      games_are_changed: {
        always: [
          { target: 'with_games', guard: 'hasGames' },
          { target: 'init', guard: 'isGamesEmpty' },
        ],
      },
    },
  },
  {
    actors: {
      doAddGame,
      doRemoveGame,
      doCreateTurn,
    },
    actions: {
      addGameSetup: assign(({ context, event }) => {
        return {
          ...context,
          codeToAdd: event.data.code,
        };
      }),
      onAddGameSuccess: assign(({ context, event }) => {
        context.deps.setInfo(event.output.msg || 'Game is added');
        context.deps.completeCommand(COMMAND.ADD_GAME);
        context.games = [...context.games, event.output.game];
        context.codeToAdd = null;
        return context;
      }),
      onAddGameError: assign(({ context, event }) => {
        context.deps.setError(event?.error || 'Error adding game');
        context.codeToAdd = null;
        return context;
      }),

      removeGameSetup: assign(({ context, event }) => {
        return {
          ...context,
          codeToRemove: event.data.code,
        };
      }),
      onRemoveGameSuccess: assign(({ context, event }) => {
        context.deps.setInfo(event.output.msg || 'Game is removed');
        // @todo: ввести команду /reset для принудительного перезапроса игр
        context.games = context.games.filter(
          (game) => game.code !== event.output.codeToRemove
        );
        context.deps.completeCommand(COMMAND.REMOVE_GAME);
        context.codeToRemove = null;
        return context;
      }),
      onRemoveGameError: assign(({ context, event }) => {
        context.deps.setError(event?.error || 'Error removing game');
        context.codeToRemove = null;
        return context;
      }),
      // Создание хода
      setupCreatingTurn: assign(({ context, event }) => {
        // Сохраняем медиа и код игры (если хотим сразу знать, куда добавлять)
        context.turnData = event.data.turnData;
        context.turnGameCode = event.data.turnGameCode;
        // Или можно «заставить» выбрать игру позже — ваш вариант
        return context;
      }),
      onCreateTurnSuccess: assign(({ context, event }) => {
        context.deps.setInfo(event.output?.msg || 'Turn created successfully');
        context.deps.completeCommand(COMMAND.CREATE_TURN, {
          turnGameCode: context.turnGameCode,
        });
        context.turnData = null;
        context.turnGameCode = null;
        return context;
      }),
      onCreateTurnError: assign(({ context, event }) => {
        context.deps.setError(event?.error || 'Error while creating turn');
        context.turnData = null;
        context.turnGameCode = null;
        return context;
      }),
    },
    guards: {
      hasGames: ({ context }) => context.games.length > 0,
      isGamesEmpty: ({ context }) => context.games.length === 0,
    },
  }
);

const actors = {};

const getActor = (userId, deps) => {
  if (!actors[userId]) {
    // сохраняем промис до завершения init(), чтобы параллельные апдейты
    // не создали два актора на одного пользователя
    actors[userId] = (async () => {
      const gameService = getGameService(userId);
      await gameService.init();
      const games = gameService.games;
      const actor = createActor(machine, {
        input: { userId, games, deps },
      });
      actor.start();
      return actor;
    })().catch((err) => {
      // неудачную инициализацию не кэшируем —
      // следующий апдейт пользователя повторит попытку
      delete actors[userId];
      throw err;
    });
  }
  return actors[userId];
};

module.exports = {
  COMMAND,
  getActor,
};
