const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const { exec } = require('child_process');
const dumpFolder = '2021-07-18-1'; //"2021-07-18-1";
const folder = path.join(__dirname, `../dumps/${dumpFolder}/TextGame`);
const command = `mongorestore --drop -d TextGame ${folder} --uri "${process.env.MONGO_URL}"`;

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
