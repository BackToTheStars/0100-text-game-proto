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
  REMOVE_ALL_GAMES: 'remove_all_games',
  IMPORT_GAMES: 'import_games',

  CREATE_TURN: 'create_turn',

  // export/import кодов игр (json-файл)
  EXPORT_GAMES: 'export_games',
  IMPORT_GAMES_FILE: 'import_games_file',
};

const ACTION_TYPE = {
  ACTOR_COMMAND: 'actor_command',
};

// Настройки меню
const menuPaths = {
  '/': {
    title: 'Main menu',
    description: 'Choose the action',
    children: [
      '/adding_game',
      '/list_games',
      '/importing_games',
      '/forgetting_game',
      '/forgetting_all_games',
    ],
    // Export — сразу команда (бот присылает json-файл), а не подменю
    buttonsCallback: (actorCtx) =>
      actorCtx.games.length > 0
        ? [{ text: 'Export games', command: COMMAND.EXPORT_GAMES, args: {} }]
        : [],
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
      if (!message) {
        // состояние потеряно (например, после рестарта бота)
        return 'No message selected. Please forward the message again.';
      }
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
      // ссылка ведёт на сам созданный ход (?turn=<turnId>)
      const turnParam = messageService.lastTurnId
        ? `&turn=${messageService.lastTurnId}`
        : '';
      const gameLink = `${CLIENT_URL}/game?hash=${lastTurnGameCode}${turnParam}`;
      const gameName = game?.name || lastTurnGameCode || 'game';
      return {
        type: 'markdown',
        text: [
          escapeMarkdownV2('New turn created. Follow the link:'),
          `[${escapeMarkdownV2(gameName)}](${gameLink})`,
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
  '/forgetting_all_games': {
    title: 'Forget all games',
    isAvailableCallback: (actorCtx) => actorCtx.games.length > 0,
    description:
      'Forget ALL your game codes? Export them first: without the file they cannot be restored. Games and turns are not affected.',
    buttonsCallback: () => [
      {
        text: 'Confirm',
        command: COMMAND.REMOVE_ALL_GAMES,
        args: {},
      },
    ],
  },
  '/importing_games': {
    title: 'Import games',
    description:
      'Send the export file (brain-games-export.json) to restore your game codes',
  },
  '/import_report': {
    title: 'Import report',
    isAvailableCallback: () => false,
    descriptionCallback: (actorCtx, messageService) => {
      const lines = ['Import finished'];
      if (messageService.lastImportLobbyWarning) {
        lines.push(messageService.lastImportLobbyWarning);
      }
      const report = messageService.lastImportReport || [];
      // не упираемся в лимит Telegram на длину сообщения (4096)
      const MAX_REPORT_LINES = 30;
      for (const item of report.slice(0, MAX_REPORT_LINES)) {
        lines.push(`${item.code}: ${item.msg}`);
      }
      if (report.length > MAX_REPORT_LINES) {
        lines.push(`...and ${report.length - MAX_REPORT_LINES} more`);
      }
      return lines.join('\n');
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
  lastTurnId = null;
  lastImportReport = null;
  lastImportLobbyWarning = null;

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
          this.lastTurnId = result.turnId || null;
          this.path = '/turn_created';
        } else if (command === COMMAND.IMPORT_GAMES) {
          this.lastImportReport = result?.report || [];
          this.path = '/import_report';
        } else if (command === COMMAND.REMOVE_ALL_GAMES) {
          this.path = '/';
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
      if (!this.lastMsg) {
        // исходное сообщение потеряно (например, бот был перезапущен)
        this.path = '/';
        return await this.showMenuWithFlash(
          'The original message was lost (bot restarted). Please forward it again.'
        );
      }
      this.path = '/create_turn';
      this.flashText = 'Preparing data...';
      await this.showMenu();

      const previewInfo = turnService.getPreviewInfo(this.lastMsg);
      if (previewInfo?.type === 'xcom') {
        this.flashText = 'Fetching tweet...';
        this.showMenu();
        this.isBusy = true;
        const xcomTimeoutId = setTimeout(() => {
          this.isBusy = false;
          this.flashText = 'New turn creation is available (please try again)';
          this.showMenu();
        }, BOT_UPLOAD_FILE_TIME_LOCK);

        turnService
          .prepareXcomTurn(this.lastMsg, previewInfo.url, args.code)
          .then((turnData) => {
            clearTimeout(xcomTimeoutId);
            this.isBusy = false;
            this.flashText = 'Creating turn...';
            this.showMenu();
            this.actorRunCommand(COMMAND.CREATE_TURN, {
              turnData,
              turnGameCode: args.code,
            });
          })
          .catch((error) => {
            clearTimeout(xcomTimeoutId);
            this.isBusy = false;
            this.flashText = error.message || 'Failed to fetch tweet';
            this.showMenu();
            console.log(error);
          });
        return;
      }

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

    // Экспорт кодов игр json-файлом
    if (command === COMMAND.EXPORT_GAMES) {
      const games = this.actorCtx.games || [];
      if (!games.length) {
        return await this.showMenuWithFlash('No games to export');
      }
      const exportData = {
        type: 'brain-games-export',
        version: 1,
        lobbyUrl: CLIENT_URL,
        exportedAt: new Date().toISOString(),
        games: games.map(({ code, name }) => ({ code, name })),
      };
      try {
        await this.deps.sendDocument({
          filename: 'brain-games-export.json',
          buffer: Buffer.from(JSON.stringify(exportData, null, 2), 'utf8'),
        });
      } catch (error) {
        console.log(error);
        return await this.showMenuWithFlash('Failed to send export file');
      }
      this.path = '/';
      return await this.showMenuWithFlash('Export file sent');
    }

    // Импорт кодов игр: пользователь прислал json-файл
    if (command === COMMAND.IMPORT_GAMES_FILE) {
      const doc = args.msg?.document;
      if (!doc) {
        return await this.showMenuWithFlash('No file in the message');
      }
      this.replyMessageId = args.msg.message_id;
      this.flashText = 'Reading file...';
      await this.showMenu();

      let data;
      try {
        data = await turnService.fetchJsonDocument(doc);
      } catch (error) {
        console.log(error);
        return await this.showMenuWithFlash(
          error.message || 'Failed to read file'
        );
      }
      if (data?.type !== 'brain-games-export' || !Array.isArray(data.games)) {
        return await this.showMenuWithFlash(
          'The file is not a brain-games-export file'
        );
      }
      const codes = data.games
        .map((game) => (typeof game === 'string' ? game : game?.code))
        .filter(Boolean);
      if (!codes.length) {
        return await this.showMenuWithFlash('No game codes in the file');
      }
      // предупреждаем, но импорт продолжаем: чужие коды отсеются как not found
      this.lastImportLobbyWarning =
        data.lobbyUrl && data.lobbyUrl !== CLIENT_URL
          ? `Warning: file lobby URL (${data.lobbyUrl}) differs from current (${CLIENT_URL})`
          : null;
      this.actorRunCommand(COMMAND.IMPORT_GAMES, { codes });
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
    if ([COMMAND.ADD_GAME, COMMAND.IMPORT_GAMES].includes(command)) {
      return true;
    }

    if (
      [
        COMMAND.REMOVE_GAME,
        COMMAND.REMOVE_ALL_GAMES,
        COMMAND.CREATE_TURN,
      ].includes(command) &&
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

const getMessageService = (id, deps) => {
  if (!messageServices.has(id)) {
    // кладём в Map промис до завершения init(), чтобы параллельная обработка
    // апдейтов (Telegraf обрабатывает пачку через Promise.all) не создала
    // два экземпляра сервиса на один чат
    messageServices.set(
      id,
      (async () => {
        const service = new MessageService(id, deps);
        await service.init();
        if (!service.actor) {
          // init() не удался (ошибка обработана внутри, актор не создан) —
          // убираем сервис из кэша, чтобы следующий апдейт повторил инициализацию
          messageServices.delete(id);
        }
        return service;
      })()
    );
  }
  return messageServices.get(id);
};

module.exports = {
  COMMAND,
  getMessageService,
};
