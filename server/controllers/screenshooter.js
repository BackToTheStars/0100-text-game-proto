const selenium = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const fs = require('fs').promises;
const path = require('path');
const SecurityLayer = require('../services/SecurityLayer');

const chromeOpts = new chrome.Options();
chromeOpts.addArguments(
  `user-data-dir=${path.resolve(
    path.join(__dirname, '..', 'selenium', 'cache')
  )}`
);

// console.log(chromeOpts);

chrome.setDefaultService(
  new chrome.ServiceBuilder(chromedriver.path, chromeOpts).build()
);

const seleniumCapabilities = {
  os_version: '10',
  resolution: '1920x1080',
  browserName: 'Chrome',
  os: 'Windows',
  name: 'screenshooter',
  build: 'none',
  'browserstack.user': 'USERNAME',
  'browserstack.key': 'TOCKEN',
};

async function sleep(time) {
  return new Promise((res, rej) => {
    setTimeout(res, time);
  });
}

async function getScreenshot(gameId) {
  const driver = new selenium.Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOpts.headless())
    .withCapabilities(selenium.Capabilities.chrome())
    .build();

  try {
    const gameHash = SecurityLayer.hashFunc(
      gameId,
      process.env.GAME_ID_HASH_LENGTH
    );
    const gameUrl = `http://localhost:3001/game?hash=${gameHash.substr(0,3)}`;
    console.log(gameUrl);
    await driver.get(gameUrl);
    //await sleep(5000);
    await driver.wait(async function () {
      const state = await driver.executeScript('return document.readyState');
      if (state === 'complete') {
        return true;
      } else {
        return false;
      }
    });
    await driver.wait(async function () {
      await driver.executeScript(`document.body.style.zoom = '10%';`);
      const gfw = await driver.executeScript(
        `return document.getElementsByClassName('gameFieldWrapper').length`
      );
      if (!gfw) return gfw;
      await driver.executeScript(
        `document.getElementsByClassName('gameFieldWrapper')[0].style.height = '1000vh'`
      );
      return true;
    });
    await driver.wait(async function () {
      const state = await driver.executeScript(
        `return window[Symbol.for('MyIsLoaded')]`
      );
      // console.log(state);
      return state === 0;
    }, 30000);
    const func2hideOverflow = () => {
      return [...document.getElementsByClassName('paragraphText')]
        .map((it, i) => {
          if (it) {
            it.style.overflow = 'hidden';
            return false;
          } else {
            return { ind: i, val: it };
          }
        })
        .filter((it) => it);
    };
    const divs_with_errors = await driver.executeScript(
      `return (${func2hideOverflow.toString()})()`
    );
    console.error(`divs_with_errors = ${JSON.stringify(divs_with_errors)}`);
    await driver.executeScript(
      `const gf = window[Symbol.for('MyGame')].gameField; const settings = gf.getFieldSettings(); gf.saveFieldSettings({...settings, left: settings.left - 100, top: settings.top - 100}); gf.triggers.dispatch('RECALCULATE_FIELD'); gf.triggers.dispatch('DRAW_LINES');`
    );

    const funcGetFieldSize = function () {
      const turns = window[Symbol.for('MyGame')].turnCollection.getTurns();
      const mapSize = turns.reduce((acc, it) => {
        const pos = it.getPositionInfo();
        if (!acc) {
          return {
            left: pos.x,
            right: pos.x + pos.width,
            top: pos.y,
            bottom: pos.y + pos.height,
          };
        } else {
          return {
            left: acc.left < pos.x ? acc.left : pos.x,
            top: acc.top < pos.y ? acc.top : pos.y,
            right:
              acc.right > pos.x + pos.width ? acc.right : pos.x + pos.width,
            bottom:
              acc.bottom > pos.y + pos.height ? acc.bottom : pos.y + pos.height,
          };
        }
      });
      return mapSize;
    };
    const mapSize = await driver.executeScript(
      `return (${funcGetFieldSize.toString()})()`
    );
    console.log(`mapSize: ${JSON.stringify(mapSize)}`);
    const windowSize = await driver.executeScript(
      `const cstyle = window.getComputedStyle(document.getElementsByClassName('gameFieldWrapper')[0]);
        return {
          'block-size': cstyle['block-size'],
          'inline-size': cstyle['inline-size']
        };
      `
    );
    console.log(`windowSize: ${JSON.stringify(windowSize)}`);

    const funcRunOverTheField = function(left, top) {
        const gf = window[Symbol.for('MyGame')].gameField;
        gf.saveFieldSettings({
          left,
          top,
          height: 1000,
          width: 1000,
        });
        gf.triggers.dispatch('RECALCULATE_FIELD');
        gf.triggers.dispatch('DRAW_LINES');
    };

    const data = await driver.takeScreenshot();
    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    const path4img = path.resolve(
      path.join(__dirname, '..', 'public', 'out.png')
    );
    await fs.writeFile(path4img, base64Data, 'base64');
    console.log(`PWD: ${process.env.PWD}`);
    console.log(`path to img: ${path4img}`);
    //setTimeout(() => {
    driver.quit();
    //}, 30000);
  } catch (err) {
    console.error(err);
    driver.quit();
  }
}

module.exports = {
  getScreenshot,
};
