const SCRIPT_SYNC_DATABASE = 'SCRIPT_SYNC_DATABASE';
const SCRIPT_ACCESS_LEVEL_INIT = 'SCRIPT_ACCESS_LEVEL_INIT';
const SCRIPT_GAME_COMMON = 'SCRIPT_GAME_COMMON';
const SCRIPT_BOT = 'SCRIPT_BOT';
const SCRIPT_MEDIA = 'SCRIPT_MEDIA';
const SCRIPT_TURN_CONTENT_TYPE = 'SCRIPT_TURN_CONTENT_TYPE';
const SCRIPT_GAME_ADDRESS = 'SCRIPT_GAME_ADDRESS';
const SCRIPT_MEDIA_FILES = 'SCRIPT_MEDIA_FILES';

const {
  checkZeroPoints,
  removeZeroPoints,
  checkGamesWithoutTurns,
  updateGamesCache,
  checkOldLines,
  removeOldLines,
  checkCodeViewports,
  removeCodeViewports,
  checkCodeHashLength,
  removeCodeHashLength,
} = require('./scripts/Game');

const {
  check: syncDatabaseCheck,
  run: syncDatabaseRun,
} = require('./scripts/SyncDatabase');

const {
  check: accessLevelCheck,
  run: accessLevelRun,
} = require('./scripts/AccessLevel');
const { MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION } = require('../../../config/admin');
const { checkTgCodes, removeTgCodesDuplicates } = require('./scripts/TgBot');
const {
  check: mediaRelocateCheck,
  run: mediaRelocateRun,
} = require('./scripts/Media');
const {
  check: contentTypeCheck,
  run: contentTypeRun,
} = require('./scripts/ContentType');
const {
  check: gameAddressCheck,
  run: gameAddressRun,
} = require('./scripts/GameAddress');
const {
  checkDeadKeys,
  removeDeadKeys,
  checkGameBackfill,
  runGameBackfill,
  revertGameBackfill,
} = require('./scripts/MediaFiles');

// Описание параметра команды для UI (name/type/description/required).
const GAME_ID_PARAM = {
  name: 'gameId',
  type: 'string',
  description: 'ID игры',
  required: true,
};
const MEDIA_HOSTS_PARAM = {
  name: 'hosts',
  type: 'string',
  description: 'Хосты media через запятую (по умолчанию — хост STATIC_MEDIA_URL)',
  required: false,
};
const MEDIA_GAME_ID_PARAM = {
  name: 'gameId',
  type: 'string',
  description: 'ID игры — только её файлы (по умолчанию — все игры)',
  required: false,
};

const scripts = [
  {
    name: SCRIPT_SYNC_DATABASE,
    description: 'Синхронизация базы данных',
    commands: [
      {
        name: 'check',
        description: 'Проверка',
        callback: syncDatabaseCheck,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
      },
      {
        name: 'run',
        description: 'Запуск',
        callback: syncDatabaseRun,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
        confirm: true,
      },
    ],
  },
  {
    name: SCRIPT_BOT,
    description: 'Управление ботом',
    commands: [
      {
        name: 'checkTgUserCodes',
        description: 'Проверка дублей кодов пользователей',
        callback: checkTgCodes,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'removeTgUserCodeDuplicates',
        description: 'Удаление дублей кодов пользователей',
        callback: removeTgCodesDuplicates,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      }
    ],
  },
  {
    name: SCRIPT_GAME_COMMON,
    description: 'Основные игровые команды',
    commands: [
      {
        name: 'checkZeroPoints',
        description: 'Проверка ZeroPoints',
        callback: checkZeroPoints,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
      },
      {
        name: 'removeZeroPoints',
        description: 'Удаление ZeroPoints',
        callback: removeZeroPoints,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
        confirm: true,
      },
      {
        name: 'checkGamesWithoutTurns',
        description: 'Проверка игр без ходов',
        callback: checkGamesWithoutTurns,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'updateGamesCache',
        description: 'Обновление кеша игр',
        callback: updateGamesCache,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      },
      {
        name: 'checkOldLines',
        description: 'Проверка старых линий',
        callback: checkOldLines,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
      },
      {
        name: 'removeOldLines',
        description: 'Удаление старых линий',
        callback: removeOldLines,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
        confirm: true,
      },
      {
        name: 'checkCodeViewports',
        description: 'Проверка кодов вьюпортов',
        callback: checkCodeViewports,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
      },
      {
        name: 'removeCodeViewports',
        description: 'Удаление кодов вьюпортов',
        callback: removeCodeViewports,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL],
        confirm: true,
      },
      {
        name: 'checkCodeHashLength',
        description: 'Проверка codeHashLength',
        callback: checkCodeHashLength,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'removeCodeHashLength',
        description: 'Удаление codeHashLength',
        callback: removeCodeHashLength,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      },
    ],
  },
  {
    name: SCRIPT_MEDIA,
    description: 'Медиа-файлы игры',
    commands: [
      {
        name: 'checkRelocate',
        description: 'Проверка: файлы игры не на текущем медиа-сервере (сухой прогон)',
        callback: mediaRelocateCheck,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        params: [GAME_ID_PARAM],
      },
      {
        name: 'relocate',
        description: 'Перенести файлы игры на текущий медиа-сервер',
        callback: mediaRelocateRun,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        params: [GAME_ID_PARAM],
        confirm: true,
      },
    ],
  },
  {
    name: SCRIPT_MEDIA_FILES,
    description: 'Файлы media: мёртвые ключи и игра старых файлов',
    commands: [
      {
        name: 'checkDeadKeys',
        description: 'Отчёт: uploader / downloader в metadata файлов',
        callback: checkDeadKeys,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'removeDeadKeys',
        description: 'Снять uploader / downloader со значением null',
        callback: removeDeadKeys,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      },
      {
        name: 'checkGameBackfill',
        description: 'Отчёт: игра файлов по ссылкам ходов и игр',
        callback: checkGameBackfill,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        params: [MEDIA_HOSTS_PARAM, MEDIA_GAME_ID_PARAM],
      },
      {
        name: 'runGameBackfill',
        description: 'Проставить игру файлам без неё (с меткой прохода)',
        callback: runGameBackfill,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        params: [MEDIA_HOSTS_PARAM, MEDIA_GAME_ID_PARAM],
        confirm: true,
      },
      {
        name: 'revertGameBackfill',
        description: 'Откатить: снять игру у файлов с меткой прохода',
        callback: revertGameBackfill,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        params: [MEDIA_GAME_ID_PARAM],
        confirm: true,
      },
    ],
  },
  {
    name: SCRIPT_TURN_CONTENT_TYPE,
    description: 'Типы ходов (contentType)',
    commands: [
      {
        name: 'check',
        description:
          'Проверка: ходы с contentType вне списка допустимых (сухой прогон)',
        callback: contentTypeCheck,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'run',
        description: 'Заменить недопустимые contentType на "picture"',
        callback: contentTypeRun,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      },
    ],
  },
  {
    name: SCRIPT_GAME_ADDRESS,
    description: 'Адрес игры полем: проставить играм, созданным до него',
    commands: [
      {
        name: 'check',
        description: 'Проверка: игры без адреса и кто из них столкнётся',
        callback: gameAddressCheck,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'run',
        description: 'Проставить адрес играм без него (столкнувшиеся пропустить)',
        callback: gameAddressRun,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      },
    ],
  },
  {
    name: SCRIPT_ACCESS_LEVEL_INIT,
    description: 'Инициализация уровня доступа',
    commands: [
      {
        name: 'check',
        description: 'Проверка',
        callback: accessLevelCheck,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
      },
      {
        name: 'run',
        description: 'Запуск',
        callback: accessLevelRun,
        modes: [MODE_DEVELOPMENT, MODE_LOCAL, MODE_PRODUCTION],
        confirm: true,
      },
    ],
  },
];

const runCommand = async (scriptName, commandName, params = {}) => {
  const script = scripts.find((item) => item.name === scriptName);

  if (!script) {
    return [false, `Script ${scriptName} not found`];
  }

  const command = script.commands.find((item) => item.name === commandName);

  if (!command) {
    return [false, `Command ${commandName} not found`];
  }

  if (!command.callback) {
    return [false, `Not implemented yet for ${scriptName} ${commandName}`];
  }

  try {
    return await command.callback(params);
  } catch (err) {
    return [false, err.message];
  }
};

module.exports = { scripts, runCommand };
