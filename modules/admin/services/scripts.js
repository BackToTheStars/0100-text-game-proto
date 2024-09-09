const SCRIPT_SYNC_DATABASE = 'SCRIPT_SYNC_DATABASE';
const SCRIPT_ACCESS_LEVEL_INIT = 'SCRIPT_ACCESS_LEVEL_INIT';
const SCRIPT_GAME_COMMON = 'SCRIPT_GAME_COMMON';
const SCRIPT_BOT = 'SCRIPT_BOT';

const {
  checkZeroPoints,
  removeZeroPoints,
  checkGamesWithoutTurns,
  updateGamesCache,
  checkOldLines,
  removeOldLines,
  checkCodeViewports,
  removeCodeViewports,
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

  return await command.callback(params);
};

module.exports = { scripts, runCommand };
