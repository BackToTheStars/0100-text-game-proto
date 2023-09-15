const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const { exec } = require('child_process');

const dumpFolder = '2023-09-13-1'; //"2021-07-18-1" in dumps folder
const targetDB = 'BrainDanceDevelopment'; // name of Database in Atlas

const folder = path.join(__dirname, `../dumps/${dumpFolder}/TextGame`);
const command = `mongorestore --drop -d ${targetDB} ${folder} --uri "${process.env.MONGO_URL}"`;

if (dumpFolder) {
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    }
    process.exit();
  });
} else {
  console.log(`Для восстановления версии БД нужно указать название дампа.`);
  process.exit();
}
