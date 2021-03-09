const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('../models/db');
const Game = require('../models/Game');
const BACKEND_URL = 'http://localhost:3000';

const screenshooter = require('../controllers/screenshooter');

const bunyan = require('bunyan');
const log = bunyan.createLogger({ name: 'turns', level: 'info' });

const start = async () => {
  // const game = await Game.findById('601e0b9886833003cc473276');
  const game = await Game.findOne({
    name: 'Тестовая игра 1',
    // lastScreenshotTime: {
    //   $gte: new Date(Date.now() - 1000 * 60 * 10),
    // },
  });

  const screenshotPath = await screenshooter.getScreenshot(game._id);
  const screenshotUrl = `${BACKEND_URL}${screenshotPath}`;

  console.log(screenshotUrl);
  console.log('finished');
  process.exit(1);
};

// 601e0b9886833003cc473276

// await screenshooter.getScreenshot(gameId);
const checkScheenshots = async () => {
  // 1) Понять в каких играх скриншот не актуален

  // lastScreenshotTime, dueScreenshotTime
  // 2) Обновить lastScreenshotTime
  // 3) Сделать скриншот
  process.exit(1);
};

start();