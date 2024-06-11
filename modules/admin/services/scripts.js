const SCRIPT_SYNC_DATABASE = 'SCRIPT_SYNC_DATABASE';
const SCRIPT_ACCESS_LEVEL_INIT = 'SCRIPT_ACCESS_LEVEL_INIT';
const SCRIPT_GAME_COMMON = 'SCRIPT_GAME_COMMON';

const {
  checkZeroPoints,
  removeZeroPoints,
  checkGamesWithoutTurns,
  updateGamesCache,
  checkOldLines,
  removeOldLines,
} = require('./scripts/Game');

const {
  check: syncDatabaseCheck,
  run: syncDatabaseRun,
} = require('./scripts/SyncDatabase');

const {
  check: accessLevelCheck,
  run: accessLevelRun,
} = require('./scripts/AccessLevel');

const scripts = [
  {
    name: SCRIPT_SYNC_DATABASE,
    description: 'Синхронизация базы данных',
    commands: [
      {
        name: 'check',
        description: 'Проверка',
        callback: syncDatabaseCheck,
      },
      {
        name: 'run',
        description: 'Запуск',
        callback: syncDatabaseRun,
      },
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
      },
      {
        name: 'removeZeroPoints',
        description: 'Удаление ZeroPoints',
        callback: removeZeroPoints,
      },
      {
        name: 'checkGamesWithoutTurns',
        description: 'Проверка игр без ходов',
        callback: checkGamesWithoutTurns,
      },
      {
        name: 'updateGamesCache',
        description: 'Обновление кеша игр',
        callback: updateGamesCache,
      },
      {
        name: 'checkOldLines',
        description: 'Проверка старых линий',
        callback: checkOldLines,
      },
      {
        name: 'removeOldLines',
        description: 'Удаление старых линий',
        callback: removeOldLines,
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
      },
      {
        name: 'run',
        description: 'Запуск',
        callback: accessLevelRun,
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
