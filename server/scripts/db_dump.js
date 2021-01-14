const { resolve } = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config({
    path: resolve(__dirname, '../.env'),
});

const dumpsDir = resolve(__dirname, '../dumps');
const date = new Date();
let folderName = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(
    -2
)}-${('0' + date.getDate()).slice(-2)}-`;

const files = fs.readdirSync(dumpsDir);
for (let i = 1; i < files.length + 2; i++) {
    if (files.indexOf(`${folderName}${i}`) === -1) {
        folderName = `${folderName}${i}`;

        break;
    }
}
const targetFolder = resolve(dumpsDir, `./${folderName}`);

const command = `mongodump --uri "${process.env.MONGO_URL}" --out ${targetFolder}`;

exec(command, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    }
    process.exit();
});
