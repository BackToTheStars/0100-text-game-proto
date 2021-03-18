const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('../models/db');
const Game = require('../models/Game');
const ScreenshotModel = require('../models/Screenshot');
const CronJob = require('cron').CronJob;
const BACKEND_URL = 'http://localhost:3000';

const screenshooter = require('../controllers/screenshooter');

const bunyan = require('bunyan');

const log = bunyan.createLogger({ name: 'turns', level: 'info' });

const job = new CronJob(
  '*/10 * * * * *',
  function () {
    console.log('You will see this message every 10 seconds');
    checkScreenshots();
  },
  null,
  true,
  'America/Los_Angeles'
);
job.start();

// http://${BACKEND_URL}/games/screenshot?hash=${HASH}

async function screenshotGame(game) {
  const imgBuffer = await screenshooter.getScreenshot(game._id);
  let screenshotModel = await ScreenshotModel.findById(game._id);
  if (!screenshotModel) {
    screenshotModel = new ScreenshotModel({
      _id: game._id,
    });
  }
  screenshotModel.data = imgBuffer;

  await screenshotModel.save();
}

const checkScreenshots = async () => {
  // 1) Понять в каких играх скриншот не актуален
  const games = await Game.find({
    dueScreenshotTime: {
      $gte: new Date(Date.now() - 1000 * 600),
    },
  });

  const gamesToScreenshot = [];
  for (let game of games) {
    if (
      game.dueScreenshotTime.getTime() !== game.lastScreenshotTime.getTime()
    ) {
      gamesToScreenshot.push(game);
      // console.log(`need to update ${game._id}`);
    }
  }

  if (gamesToScreenshot.length) {
    // for (let game of gamesToScreenshot) {
    // lastScreenshotTime, dueScreenshotTime
    // 2) Обновить lastScreenshotTime
    // 3) Сделать скриншот
    const game = gamesToScreenshot[0];
    game.lastScreenshotTime = game.dueScreenshotTime = new Date(); // a = b = c, b = c, a = b
    // @todo: check if error occured
    await game.save();
    await screenshotGame(game);
    console.log({
      dueScreenshotTime: game.dueScreenshotTime,
      lastScreenshotTime: game.lastScreenshotTime,
    });
    // }
  }

  // process.exit(0);
};
