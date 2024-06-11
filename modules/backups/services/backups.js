const fs = require('fs');
const path = require('path');
const { BACKUP_DIR } = require('../../../config/backup');
const mongoose = require('mongoose');
const { exec } = require('child_process');

const getBackupDirs = async () => {
  const items = (await fs.readdirSync(BACKUP_DIR))
    .map((dir) => ({
      path: dir,
    }))
    .filter((item) => item.path.match(/^\d{4}-\d{2}-\d{2}-\d{3}$/));
  for (const dir of items) {
    const subDirs = await fs.readdirSync(path.join(BACKUP_DIR, dir.path));
    dir.path += `/${subDirs[0]}`;
  }
  return items;
};

const getDbNameFromConnectionString = (connectionString) => {
  const url = new URL(connectionString);
  const pathnameWithoutQuery = url.pathname.split('?')[0];
  return pathnameWithoutQuery.split('/')[1];
};

const getDumpCommand = (connectionString) => {
  const date = new Date();
  let folderName = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
    -2
  )}-${('0' + date.getDate()).slice(-2)}-`;
  const files = fs.readdirSync(BACKUP_DIR);
  for (let i = 1; i < files.length + 2; i++) {
    const num = (i + '').padStart(3, '0');
    if (files.indexOf(`${folderName}${num}`) === -1) {
      folderName = `${folderName}${num}`;
      break;
    }
  }
  const targetFolder = path.join(BACKUP_DIR, folderName);
  return `mongodump --uri "${connectionString}" --out ${targetFolder}`;
};

const removeAllCollections = async (connectionString) => {
  const connection = await mongoose.createConnection(connectionString, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  });
  const db = connection.db;

  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).drop();
  }

  await connection.close();
};

const getRestoreCommand = async (connectionString) => {
  const backupDirs = await getBackupDirs();
  const folderName = backupDirs.at(-1).path;
  const sourceFolder = path.join(BACKUP_DIR, folderName);
  const targetDb = getDbNameFromConnectionString(connectionString);
  return `mongorestore --drop -d ${targetDb} ${sourceFolder} --uri "${connectionString}"`;
};

const execCommand = async (command) => {
  const { stdout, stderr } = await new Promise((resolve, reject) =>
    exec(command, (err, stdout, stderr) =>
      err ? reject(err) : resolve({ stdout, stderr })
    )
  );
  return { stdout, stderr };
};

module.exports = {
  getBackupDirs,
  getDumpCommand,
  removeAllCollections,
  getRestoreCommand,
  execCommand,
};
