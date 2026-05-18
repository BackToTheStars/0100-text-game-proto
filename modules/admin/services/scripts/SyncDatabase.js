const { getDumpCommand, execCommand, getRestoreCommand } = require("../../../backups/services/backups");

const backupConnectionUrl = process.env.BACKUP_MONGO_URL;
const restoreConnectionUrl = process.env.RESTORE_MONGO_URL;

const getHostPortAndDatabaseName = (connectionUrl) => {
  const url = new URL(connectionUrl);
  return `${url.hostname}:${url.port}/${url.pathname.substring(1)}`;
};

const check = async () => {
  return [
    true,
    `Будет сделан дамп БД
    ${getHostPortAndDatabaseName(backupConnectionUrl)}
    и восстановлен в
    ${getHostPortAndDatabaseName(restoreConnectionUrl)}`,
  ];
};

const run = async () => {
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
