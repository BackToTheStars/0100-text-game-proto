const messageServices = new Map();
const gameMachine = require('./gameMachine');
const { logXstateTransition, logMsgServiceRun } = require('./logger'); // Подключаем наш logger
const { CLIENT_URL } = require('../../../config/url');
const { TaskQueue } = require('./taskQueue');
const { BOT_UPLOAD_FILE_TIME_LOCK } = require('../../../config/bot');

const COMMAND = {
  UNKNOWN: 'unknown',
  MENU: 'menu',
  TEXT: 'text',
  MENU_NAV: 'menu_nav',
  STATUS: 'status',

  // <<< ADDED for remove confirm >>>
  PROMPT_REMOVE_GAME: 'prompt_remove_game',
  CONFIRM_REMOVE_GAME: 'confirm_remove_game',
  CANCEL_REMOVE_GAME: 'cancel_remove_game',

  SETUP_TURN_CREATION_MSG: 'setup_turn_creation_msg',
  SETUP_TURN_CREATION_GAME: 'setup_turn_creation_game',

  // actor commands
  ADD_GAME: 'add_game',
  REMOVE_GAME: 'remove_game',

  CREATE_TURN: 'create_turn',
};

const ACTION_TYPE = {
  ACTOR_COMMAND: 'actor_command',
};

// Настройки меню
const menuPaths = {
  '/': {
    title: 'Main menu',
    description: 'Choose the action',
    children: ['/adding_game', '/list_games', '/forgetting_game'],
  },
  '/adding_game': {
    title: 'Add game',
    description: 'Enter the code of the game',
    textCommandCallback: (text) => {
      return {
        type: ACTION_TYPE.ACTOR_COMMAND,
        command: COMMAND.ADD_GAME,
        args: { code: text },
      };
    },
  },
  '/list_games': {
    title: 'List of games',
    isAvailableCallback: (actorCtx) => actorCtx.games.length > 0,
    descriptionCallback: (actorCtx) => {
      const arrText = ['List of games:'];
      actorCtx.games.forEach(({ name, code }) => {
        const gameLink = `${CLIENT_URL}/game?hash=${code}`;
        arrText.push(`[${escapeMarkdownV2(name)}](${gameLink})`);
      });

      return {
        type: 'markdown',
        text: arrText.join('\n'),
      };
    },
  },
  '/choose_game_for_turn': {
    title: 'Choose game for turn',
    isAvailableCallback: (actorCtx) => actorCtx.games.length > 0,
    description: 'Choose game to forward turn',
    buttonsCallback: (actorCtx) => {
      return actorCtx.games.map(({ code, name }) => ({
        text: name,
        command: COMMAND.SETUP_TURN_CREATION_GAME,
        args: { code },
      }));
    },
  },
  '/create_turn': {
    title: 'Create turn',
    isAvailableCallback: () => false,
    descriptionCallback: (actorCtx, messageService) => {
      const message = messageService.lastMsg;
      const isForward = messageService.turnService.isForward(message);
      const mediaInfo = messageService.turnService.getMediaInfo(message);
      const previewInfo = messageService.turnService.getPreviewInfo(message);
      const hasEntities = !!message.caption_entities || !!message.entities;

      const textLines = ['Turn creation'];
      if (isForward) {
        textLines.push(`Forwarded`);
      }
      if (mediaInfo) {
        textLines.push(`Media: ${mediaInfo.type}`);
      }
      if (previewInfo) {
        textLines.push(`Preview: ${previewInfo.type}`);
      }
      if (hasEntities) {
        textLines.push(`Has entities`);
      }

      return textLines.join('\n');
    },
  },
  '/turn_created': {
    title: 'Turn created',
    isAvailableCallback: () => false,
    descriptionCallback: (actorCtx, messageService) => {
      const lastTurnGameCode = messageService.lastTurnGameCode;
      const game = actorCtx.games.find(({ code }) => code === lastTurnGameCode);
      const gameLink = `${CLIENT_URL}/game?hash=${lastTurnGameCode}`;
      return {
        type: 'markdown',
        text: [
          escapeMarkdownV2('New turn created. Follow the link:'),
          `[${escapeMarkdownV2(game.name)}](${gameLink})`,
        ].join('\n'),
      };
    },
  },
  '/forgetting_game': {
    title: 'Forget game',
    isAvailableCallback: (actorCtx) => actorCtx.games.length > 0,
    description: 'Choose the game to forget',
    buttonsCallback: (actorCtx) => {
      // Вместо REMOVE_GAME сразу — добавим промежуточную команду PROMPT_REMOVE_GAME
      return actorCtx.games.map(({ code, name }) => ({
        text: name,
        command: COMMAND.PROMPT_REMOVE_GAME,
        args: {
          code,
          // name
        },
      }));
    },
  },
};

const escapeMarkdownV2 = (text = '') => {
  if (typeof text !== 'string') {
    return 'Unexpected type of markdown text';
  }
  return text.replace(/[_*[\]()~`>#+\-={}|.!]/g, '\\$&');
};

class MessageService {
  id = null;
  deps = null;

  botMsgId = null;

  flashText = null;
  text = null;
  buttons = null;
  replyMessageId = null;
  lastMsg = null;
  lastTurnGameCode = null;

  path = '/';

  actorValue = null;

  isBusy = false;

  turnService = null;
  actorCtx = {
    games: [],
  };

  // <<< ADDED for remove confirm >>>
  removeGameCandidate = null;

  constructor(id, deps) {
    this.id = id;
    this.deps = deps;
    this.actorDeps = {
      setError: (text) => {
        this.flashText = text;
      },
      setInfo: (text) => {
        this.flashText = text;
      },
      completeCommand: (command, result) => {
        if (command === COMMAND.ADD_GAME) {
          this.path = '/';
        } else if (command === COMMAND.CREATE_TURN) {
          this.lastTurnGameCode = result.turnGameCode;
          this.path = '/turn_created';
        }
      },
    };
    this.taskQueue = new TaskQueue();
    this.turnService = deps.getTurnService();
  }

  async init() {
    try {
      this.actor = await gameMachine.getActor(this.id, this.actorDeps);
      const snapshot = this.actor.getSnapshot();
      this.actorValue = snapshot.value;
      this.actorCtx = snapshot.context;
      await this.showMenu();

      // Подписываемся на изменения состояния (xState)
      this.actor.subscribe(async (state) => {
        logXstateTransition(this.id, state);

        this.taskQueue.enqueue(async () => {
          this.actorValue = state.value;
          this.actorCtx = state.context;
          await this.showMenu();
        });
      });
    } catch (e) {
      this.flashText = e.message;
      await this.showMenu();
      console.error(e);
    }
  }

  async run(command, args) {
    const turnService = this.turnService;
    logMsgServiceRun(this.id, { command, args });
    // @todo: использовать статус только в режиме отладки
    if (command === COMMAND.STATUS) {
      return await this.showStatus();
    } else if (this.actorIsBusy() || this.isBusy) {
      return await this.showMenuWithFlash(
        'Please wait for the current operation to complete...'
      );
    } else if (command === COMMAND.MENU) {
      return await this.showMenu();
    } else if (command === COMMAND.MENU_NAV) {
      this.replyMessageId = null;
      this.path = args.path;
      return await this.showMenu();
    }

    if (command === COMMAND.SETUP_TURN_CREATION_MSG) {
      if (!this.actorHasCommand(COMMAND.CREATE_TURN)) {
        return await this.showMenuWithFlash('Cannot create turn for now');
      }
      this.path = '/choose_game_for_turn';
      this.replyMessageId = args.msg.message_id;
      this.lastMsg = args.msg;

      await this.showMenu();
      return;
    }

    if (command === COMMAND.SETUP_TURN_CREATION_GAME) {
      this.path = '/create_turn';
      this.flashText = 'Preparing data...';
      await this.showMenu();

      // const message = this.lastMsg;
      const { needToUploadMedia, fileType, fileObj } = turnService.getFileInfo(
        this.lastMsg
      );

      const runCreateTurnCommand = (msg, uploadedObject, turnGameCode) => {
        this.flashText = 'Creating turn...';
        this.showMenu();
        // случаи, когда подготовка данных требуется
        turnService
          .prepareTurnByMsg(msg, uploadedObject)
          .then((turnData) => {
            this.actorRunCommand(COMMAND.CREATE_TURN, {
              turnData,
              turnGameCode,
            });
          })
          .catch((error) => {
            this.isBusy = false;
            this.flashText = error.message;
            this.showMenu();
            console.log(error);
          });
      };

      // случаи, когда подготовка данных требуется
      if (needToUploadMedia) {
        // временно заблокировать дальнейшие действия
        this.flashText = 'Uploading media...';
        this.showMenu();
        this.isBusy = true;
        let timeoutId = setTimeout(() => {
          this.isBusy = false;
          this.flashText = 'New turn creation is available (please try again)';
          this.showMenu();
        }, BOT_UPLOAD_FILE_TIME_LOCK);
        turnService
          .prepareUploadedObject(this.lastMsg, fileType, fileObj, args.code)
          .then((data) => {
            clearTimeout(timeoutId);
            this.isBusy = false;
            if (!data) {
              this.flashText = 'Failed to upload media';
              this.showMenu();
              return;
            }
            runCreateTurnCommand(this.lastMsg, data, args.code);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            this.isBusy = false;
            this.flashText = error.message;
            this.showMenu();
          });
        return;
      }

      // случаи, когда подготовка данных не требуется
      runCreateTurnCommand(this.lastMsg, null, args.code);
      return;
    }

    // <<< ADDED for remove confirm >>>
    // 1) Нажали на кнопку с названием игры
    if (command === COMMAND.PROMPT_REMOVE_GAME) {
      return await this.showRemoveGameConfirmDialog(args.code);
    }

    // 2) Пользователь подтвердил удаление
    if (command === COMMAND.CONFIRM_REMOVE_GAME) {
      if (!this.removeGameCandidate) {
        // На всякий случай, если нет сохранённого кандидата
        return await this.showMenuWithFlash('No game candidate to remove');
      }

      // Вызов команды удаления (REMOVE_GAME) в xState
      // Передадим code, чтобы машина понимала, что удалять
      // name — для flash-сообщения
      this.actorRunCommand(COMMAND.REMOVE_GAME, {
        code: this.removeGameCandidate.code,
        // name: this.removeGameCandidate.name,
      });

      // Чтобы после удаления отобразился flash «Forgot game ...» (если хотим кастом),
      // можно тоже тут выставить:
      // this.flashText = `Forgot game ${this.removeGameCandidate.name}`;

      this.removeGameCandidate = null;
      return; // Дальше xState вызовет subscribe → showMenu()
    }
    // 3) Отмена удаления
    if (command === COMMAND.CANCEL_REMOVE_GAME) {
      this.removeGameCandidate = null;
      return await this.showMenu();
    }

    // Если введён обычный текст
    if (command === COMMAND.TEXT) {
      const pathSettings = menuPaths[this.path];
      if (!pathSettings.textCommandCallback) {
        return this.showMenuWithFlash(
          'No text input is available for the current state'
        );
      }
      const actionObject = pathSettings.textCommandCallback(args.text);
      if (actionObject.type === ACTION_TYPE.ACTOR_COMMAND) {
        if (this.actorHasCommand(actionObject.command)) {
          return this.actorRunCommand(actionObject.command, actionObject.args);
        }
      } else {
        return await this.showMenuWithFlash(
          `Text commands for type ${actionObject.type} are not implemented yet`
        );
      }
    } else if (this.actorHasCommand(command)) {
      // Здесь обрабатываются ADD_GAME, REMOVE_GAME и т.п.
      return await this.actorRunCommand(command, args);
    }

    // Если команда не распознана
    await this.showMenuWithFlash(`Command ${command} is unknown`);
  }

  actorIsBusy() {
    return this.actor.getSnapshot().hasTag('busy');
  }

  actorHasCommand(command) {
    // @todo: перенести в конфиги актора
    if (command === COMMAND.ADD_GAME) {
      return true;
    }

    if (
      [COMMAND.REMOVE_GAME, COMMAND.CREATE_TURN].includes(command) &&
      this.actorCtx.games?.length
    ) {
      return true;
    }
    return false;
  }

  actorRunCommand(command, args) {
    this.actor.send({ type: command, data: args });
  }

  loadStateSettings() {
    const pathSettings = menuPaths[this.path];
    if (pathSettings.descriptionCallback) {
      this.text = pathSettings.descriptionCallback(this.actorCtx, this);
    } else {
      this.text = pathSettings.description;
    }
    this.buttons = [];
    if (pathSettings.children?.length) {
      for (const childPath of pathSettings.children) {
        const childPathSettings = menuPaths[childPath];
        if (
          !childPathSettings.isAvailableCallback ||
          childPathSettings.isAvailableCallback(this.actorCtx)
        ) {
          this.buttons.push({
            text: childPathSettings.title,
            command: COMMAND.MENU_NAV,
            args: { path: childPath },
          });
        }
      }
    }
    if (pathSettings.buttonsCallback) {
      this.buttons.push(...pathSettings.buttonsCallback(this.actorCtx));
    }
    if (this.path !== '/') {
      this.buttons.push({
        text: 'Back',
        command: COMMAND.MENU_NAV,
        args: { path: '/' },
      });
    }
  }

  async showStatus() {
    const info = {
      actor: {
        value: this.actorValue,
        context: this.actorCtx,
      },
      path: this.path,
    };
    await this.deps.showMessage({
      text:
        '```json\n' + escapeMarkdownV2(JSON.stringify(info, null, 2)) + '\n```',
    });
  }

  async showMenu() {
    const arrText = [];
    const prevFlashText = this.flashText;
    this.flashText = null;
    if (prevFlashText) {
      arrText.push(`*${escapeMarkdownV2(prevFlashText)}*`);
    }

    if (this.actor && this.actor.getSnapshot().hasTag('busy')) {
      this.buttons = [];
      this.text = `Processing stage ${this.actorValue}`;
    } else {
      this.loadStateSettings();
    }
    if (typeof this.text === 'string') {
      arrText.push(escapeMarkdownV2(this.text));
    } else {
      if (this.text?.type === 'markdown') {
        arrText.push(this.text.text);
      } else {
        arrText.push('Unknown text type');
      }
    }

    await this.deps.showMessage({
      text: arrText.join('\n'),
      buttons: this.buttons.map((button) => ({
        text: button.text,
        callback_data: `${button.command}---${JSON.stringify(button.args)}`,
      })),
      replyMessageId: this.replyMessageId,
      answerCb: prevFlashText,
    });
  }

  async showMenuWithFlash(flashText) {
    this.flashText = flashText;
    await this.showMenu();
  }

  // <<< ADDED for remove confirm >>>
  async showRemoveGameConfirmDialog(code) {
    this.removeGameCandidate = { code };

    // Спрашиваем, действительно ли нужно удалить
    const text = `Forget *${escapeMarkdownV2(code)}*?`;
    const buttons = [
      {
        text: 'Confirm',
        command: COMMAND.CONFIRM_REMOVE_GAME,
        args: {},
      },
      {
        text: 'Cancel',
        command: COMMAND.CANCEL_REMOVE_GAME,
        args: {},
      },
    ];

    await this.deps.showMessage({
      text,
      buttons: buttons.map((b) => ({
        text: b.text,
        callback_data: `${b.command}---${JSON.stringify(b.args)}`,
      })),
      replyMessageId: null,
      answerCb: null,
    });
  }
}

const getMessageService = async (id, deps) => {
  if (!messageServices.has(id)) {
    const service = new MessageService(id, deps);
    await service.init();
    messageServices.set(id, service);
  }
  return messageServices.get(id);
};

module.exports = {
  COMMAND,
  getMessageService,
};
