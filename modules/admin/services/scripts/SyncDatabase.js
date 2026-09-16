const { getDumpCommand, execCommand, getRestoreCommand } = require("../../../backups/services/backups");

const backupConnectionUrl = process.env.BACKUP_MONGO_URL;
const restoreConnectionUrl = process.env.RESTORE_MONGO_URL;

const MISSING_VARS_MESSAGE =
  'BACKUP_MONGO_URL и/или RESTORE_MONGO_URL не заданы';

const getHostPortAndDatabaseName = (connectionUrl) => {
  const url = new URL(connectionUrl);
  return `${url.hostname}:${url.port}/${url.pathname.substring(1)}`;
};

const check = async () => {
  if (!backupConnectionUrl || !restoreConnectionUrl) {
    return [false, MISSING_VARS_MESSAGE];
  }
  return [
    true,
    `Будет сделан дамп БД
    ${getHostPortAndDatabaseName(backupConnectionUrl)}
    и восстановлен в
    ${getHostPortAndDatabaseName(restoreConnectionUrl)}`,
  ];
};

const run = async () => {
  if (!backupConnectionUrl || !restoreConnectionUrl) {
    return [false, MISSING_VARS_MESSAGE];
  }
  const createCommand = getDumpCommand(backupConnectionUrl);
  await execCommand(createCommand);
  const restoreCommand = await getRestoreCommand(restoreConnectionUrl);
  await execCommand(restoreCommand);

  return [true, "База данных успешно обновлена"];
};

module.exports = {
  check,
  run,
};
