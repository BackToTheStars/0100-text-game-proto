const selenium = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const _fs = require('fs');
const fs = _fs.promises;
const path = require('path');
const SecurityLayer = require('../services/SecurityLayer');

const images = require('images');
//const sharp = require('sharp');

const chromeOpts = new chrome.Options();
chromeOpts.addArguments(
  `user-data-dir=${path.resolve(
    path.join(__dirname, '..', 'selenium', 'cache')
  )}`,
  'use-fake-ui-for-media-stream'
);

console.log(chromeOpts);

console.log(`chromedriver.path: `, chromedriver.path);

chrome.setDefaultService(
  new chrome.ServiceBuilder(
    /*path.join(
      __dirname,
      'chrome-driver',
      'chromedriver.exe'
    )*/ chromedriver.path,
    chromeOpts
  ).build()
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

const ZOOM_FACTOR = 10;
const PATH4SCREENS = path.join(__dirname, '..', 'public');

async function getScreenshot(gameId) {
  try {
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

      const PATH4GAMESCREENS = path.join(
        PATH4SCREENS,
        `./${gameHash.substr(0, 3)}`
      );

      if (!_fs.existsSync(PATH4GAMESCREENS)) {
        await fs.mkdir(PATH4GAMESCREENS, { recursive: true });
      }
      const gameUrl = `http://localhost:3001/game?hash=${gameHash.substr(
        0,
        3
      )}`;
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
        await driver.executeScript(
          `document.body.style.zoom = '${100 / ZOOM_FACTOR}%';`
        );
        const gfw = await driver.executeScript(
          `return document.getElementsByClassName('gameFieldWrapper').length`
        );
        if (!gfw) return gfw;
        await driver.executeScript(
          `document.getElementsByClassName('gameFieldWrapper')[0].style.height = '${
            100 * ZOOM_FACTOR
          }vh';
            document.getElementById('gameBox').style.height = '${
              100 * ZOOM_FACTOR
            }vh';
            document.getElementById('gameBox').style.width = '${
              100 * ZOOM_FACTOR
            }vw';`
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
      const divs_with_errors = await driver.executeScript(
        `return (${func2hideOverflow.toString()})()`
      );
      console.error(`divs_with_errors = ${JSON.stringify(divs_with_errors)}`);
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

      const files = await fs.readdir(path.join(PATH4GAMESCREENS));
      console.log(files);
      for (const ent of files) {
        await fs.unlink(path.join(PATH4GAMESCREENS, ent));
      }

      const extraSpaceReturnArgument = {
        left: null,
        right: null,
        top: null,
        bottom: null,
      };

      const imgPaths = await funcRunOverTheField(
        driver,
        mapSize,
        windowSize,
        PATH4GAMESCREENS,
        extraSpaceReturnArgument
      );

      const maxi = imgPaths.reduce((acc, it) => {
        return acc > it.i ? acc : it.i;
      }, 0);
      const maxj = imgPaths.reduce((acc, it) => {
        return acc > it.j ? acc : it.j;
      }, 0);
      //      if (!(maxi >= 1 && maxj >= 1)) {
      //        throw new Error(`${JSON.stringify({maxi, maxj})}`);
      //      }
      const imgArr = [];
      for (let i = 0; i <= maxi; i++) {
        const arr = imgPaths.filter((it) => it.i == i);
        imgArr.push(arr);
      }
      imgArr.sort((a, b) => a[0].i < b[0].i);

      console.log(imgArr);
      for (let i = 0; i <= maxi; i++) {
        for (let j = 0; j <= maxj; j++) {
          const path = imgArr[i][j].path4img;
          console.log(`trying to process: ${path}`);
          const img = await images(path);
          //          console.log(await img.size());
          imgArr[i][j] = {
            ...imgArr[i][j],
            img,
            w: img.width(),
            h: img.height(),
          };
        }
      }

      const mmSize = imgArr.reduce(
        (acc, it) => {
          const subSize = it.reduce(
            (acc2, it2) => ({ w: acc2.w + it2.w, h: Math.max(acc2.h, it2.h) }),
            { w: 0, h: 0 }
          );
          return { w: Math.max(acc.w, subSize.w), h: acc.h + subSize.h };
        },
        { w: 0, h: 0 }
      );

      //   console.log(`${JSON.stringify(mmSize)}`);

      const mm = images(mmSize.w, mmSize.h);
      let curY = 0;
      for (const row of imgArr) {
        // console.log(`curY: ${curY}`);
        let curX = 0;
        let maxY = 0;
        for (const imgDsc of row) {
          //   console.log(`curX: ${curX}`);
          //   console.log(imgDsc);
          mm.draw(imgDsc.img, curX, curY);
          curX += imgDsc.w;
          maxY = maxY > imgDsc.h ? maxY : imgDsc.h;
        }
        curY += maxY;
      }

      console.log('going to cut borders off ...');
      /*
      const mmCut = images(
        mmSize.w -
          extraSpaceReturnArgument.left -
          extraSpaceReturnArgument.right,
        mmSize.h -
          extraSpaceReturnArgument.top -
          extraSpaceReturnArgument.bottom
      );
      mmCut.draw(
        mm,
        -extraSpaceReturnArgument.left,
        -extraSpaceReturnArgument.top
      );
      */

      const mmCut = images(
        mm,
        extraSpaceReturnArgument.left / ZOOM_FACTOR,
        extraSpaceReturnArgument.top / ZOOM_FACTOR,
        mmSize.w -
          (extraSpaceReturnArgument.left + extraSpaceReturnArgument.right) /
            ZOOM_FACTOR,
        mmSize.h -
          (extraSpaceReturnArgument.top + extraSpaceReturnArgument.bottom) /
            ZOOM_FACTOR
      );

      console.log('saving screenshot...');

      // await mmCut.save(path.join(PATH4GAMESCREENS, `output.png`));
      // console.log('saved.');

      //      console.log(`images.getUsedMemory(): `, images.getUsedMemory());

      await driver.quit();
      // return `/${gameHash.substr(0, 3)}/output.png`;
      return mmCut.encode('png');
    } catch (err) {
      console.error(err);
      await driver.quit();
    }
  } catch (err) {
    console.error(err);
  }
}

async function funcRunOverTheField(
  driver,
  { left, top, right, bottom },
  winsize,
  path4GameScreen,
  extraSpaceReturnArgument
) {
  const funcMoveField = async function (left, top) {
    const gf = window[Symbol.for('MyGame')].gameField;
    gf.stageEl.css('left', `${-left}px`);
    gf.stageEl.css('top', `${-top}px`);
    gf.saveFieldSettings({
      left,
      top,
      height: 1000,
      width: 1000,
    });
    await gf.triggers.dispatch('RECALCULATE_FIELD');
    await gf.triggers.dispatch('DRAW_LINES');
  };
  const funcTakeScreen = async function (i, j) {
    const fieldCoords = await driver.executeScript(
      `return await (${funcGetFieldSize.toString()})();`
    );
    console.log(`funcTakeScreen: fieldCoords: ${JSON.stringify(fieldCoords)}`);
    const data = await driver.takeScreenshot();
    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    const path4img = path.resolve(
      path.join(path4GameScreen, `out_${i}_${j}.png`)
    );
    await fs.writeFile(path4img, base64Data, 'base64');
    console.log(`i: ${i}, j: ${j}: done`);
    return { i, j, path4img };
  };
  const imgPaths = [];
  await driver.executeScript(
    `await (${funcMoveField.toString()})(${left}, ${top});`
  );
  console.log('after the first move');
  let xAim = right - left;
  let yAim = bottom - top;
  console.log(`xAim: ${xAim}, yAim: ${yAim}`);
  let i = 0;
  let wstep = winsize['inline-size'];
  wstep = +wstep.substr(0, wstep.length - 2);
  let hstep = winsize['block-size'];
  hstep = +hstep.substr(0, hstep.length - 2);
  console.log(`{wstep: ${wstep}, hstep: ${hstep}}`);
  let h = 0;
  let w = 0;

  let gapX = Math.ceil(xAim / wstep) * wstep - xAim;
  let gapY = Math.ceil(yAim / hstep) * hstep - yAim;

  extraSpaceReturnArgument.left = gapX / 2;
  extraSpaceReturnArgument.right = gapX / 2;
  extraSpaceReturnArgument.top = gapY / 2;
  extraSpaceReturnArgument.bottom = gapY / 2;

  console.log(
    `extraSpaceReturnArgument: ${JSON.stringify(extraSpaceReturnArgument)}`
  );

  await driver.executeScript(
    `await (${funcMoveField.toString()})(${-gapX / 2}, ${-gapY / 2});`
  );

  console.log({ gapX, gapY, xAim, yAim, winsize, wstep, hstep });

  for (; h < yAim; h += hstep) {
    let j = 0;
    w = 0;
    imgPaths.push(await funcTakeScreen(i, j));
    w += wstep;
    j++;
    for (; w < xAim; w += wstep) {
      await driver.executeScript(
        `await (${funcMoveField.toString()})(${wstep},0)`
      );
      imgPaths.push(await funcTakeScreen(i, j));
      j++;
    }
    await driver.executeScript(
      `await (${funcMoveField.toString()})(${-(w - wstep)},${hstep})`
    );
    i++;
    console.log(`after a cycle: h: ${h}, w: ${w}`);
  }
  console.log(`after all: h: ${h}, w: ${w}`);
  return imgPaths;
}

function funcGetFieldSize() {
  const turns = window[Symbol.for('MyGame')].turnCollection.getTurns();
  const mapSize = turns.reduce(
    (acc, it) => {
      const pos = it.getPositionInfo();
      if (acc.uninit) {
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
          right: acc.right > pos.x + pos.width ? acc.right : pos.x + pos.width,
          bottom:
            acc.bottom > pos.y + pos.height ? acc.bottom : pos.y + pos.height,
        };
      }
    },
    { uninit: true }
  );
  return mapSize;
}

function func2hideOverflow() {
  const buttonPanels = document.getElementsByClassName('actions');
  if (buttonPanels && buttonPanels.length == 1) {
    buttonPanels[0].style.display = 'none';
  } else {
    console.log(`buttonPanel not found`);
  }
  const minimapPanels = document.getElementsByClassName('minimap-panel');
  if (minimapPanels && minimapPanels.length == 1) {
    minimapPanels[0].style.display = 'none';
  } else {
    console.log(`minimapPanels not found`);
  }
  const gameInfoPanel = document.getElementById('gameInfoPanel');
  if (gameInfoPanel) {
    gameInfoPanel.style.display = 'none';
  } else {
    console.log(`gameInfoPanel not found`);
  }
  const leftBottomLabels = document.getElementsByClassName('left-bottom-label');
  if (leftBottomLabels) {
    [...leftBottomLabels].forEach((it) => {
      it.style.display = 'none';
    });
  } else {
    console.log(`leftBottomLabels not found`);
  }
  const rightBottomLabels = document.getElementsByClassName(
    'right-bottom-label'
  );
  if (rightBottomLabels) {
    [...rightBottomLabels].forEach((it) => {
      it.style.display = 'none';
    });
  } else {
    console.log(`rightBottomLabels not found`);
  }
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
}

module.exports = {
  getScreenshot,
};
