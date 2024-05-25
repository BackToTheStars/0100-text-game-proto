const {
  getBackupDirs,
  getDumpCommand,
  getRestoreCommand,
  removeAllCollections,
} = require('../services/backups');
const { exec } = require('child_process');

const backupConnectionUrl = process.env.BACKUP_MONGO_URL;
const restoreConnectionUrl = process.env.RESTORE_MONGO_URL;

const execCommand = async (command) => {
  const { stdout, stderr } = await new Promise((resolve, reject) =>
    exec(command, (err, stdout, stderr) =>
      err ? reject(err) : resolve({ stdout, stderr })
    )
  );
  return { stdout, stderr };
}

// actions
const list = async (req, res, next) => {
  try {
    const items = await getBackupDirs();
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const command = getDumpCommand(backupConnectionUrl);
    await execCommand(command);
    const items = await getBackupDirs();
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const command = await getRestoreCommand(restoreConnectionUrl);
    await execCommand(command);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

const createAndRestore = async (req, res, next) => {
  try {
    const createCommand = getDumpCommand(backupConnectionUrl);
    await execCommand(createCommand);
    
    await removeAllCollections(restoreConnectionUrl);
    const restoreCommand = await getRestoreCommand(restoreConnectionUrl);
    await execCommand(restoreCommand);

    res.json({ success: true });
    
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  restore,
  createAndRestore,
};
