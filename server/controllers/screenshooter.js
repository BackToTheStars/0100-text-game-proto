const selenium = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const fs = require('fs').promises;
const path = require('path');

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

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

async function getScreenshot() {
  const driver = new selenium.Builder()
    .withCapabilities(selenium.Capabilities.chrome())
    .build();

  try {
    await driver.get('http://localhost:3001/game?hash=045');
    //await sleep(5000);
    await driver.wait(async function () {
      const state = await driver.executeScript('return document.readyState');
      if (state === 'complete') {
        return true;
      } else {
        return false;
      }
    });
    await driver.executeScript(
      `document.body.style.zoom = '10%'; document.getElementsByClassName('gameFieldWrapper')[0].style.height = '1000vh'`
    );
    await driver.wait(async function () {
      const state = await driver.executeScript(
        `return window[Symbol.for('MyIsLoaded')]`
      );
      console.log(state);
      return state === 0;
    }, 30000);
    console.log(
      function () {
        console.log('qwer');
      }.toString()
    );
    const func2hidOverflow = () => {
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
      `return (${func2hidOverflow.toString()})()`
    );
    console.error(`divs_with_errors = ${JSON.stringify(divs_with_errors)}`);
    await driver.executeScript(
      `const gf = window[Symbol.for('MyGame')].gameField; const settings = gf.getFieldSettings(); gf.saveFieldSettings({...settings, left: settings.left - 100, top: settings.top - 100}); gf.triggers.dispatch('RECALCULATE_FIELD'); gf.triggers.dispatch('DRAW_LINES');`
    );
    const data = await driver.takeScreenshot();
    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    const path4img = path.resolve(
      path.join(__dirname, '..', 'public', 'out.png')
    );
    await fs.writeFile(path4img, base64Data, 'base64');
    console.log(`PWD: ${process.env.PWD}`);
    console.log(`path to img: ${path4img}`);
    setTimeout(() => {
      driver.quit();
    }, 30000);
  } catch (err) {
    console.error(err);
    driver.quit();
  }
}

module.exports = {
  getScreenshot,
};
