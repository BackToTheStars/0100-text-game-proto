const selenium = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const fs = require('fs');
const path = require('path');

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

const seleniumCapabilities = {
    'os_version': '10',
    'resolution': '1920x1080',
    'browserName': 'Chrome',
    'os': 'Windows',
    'name': 'screenshooter',
    'build': 'none',
    'browserstack.user': 'USERNAME',
    'browserstack.key': 'TOCKEN',
};

async function sleep(time) {
    return new Promise((res, rej) => {
        setTimeout(res, time);
    })
}

async function getScreenshot() {
    const driver = new selenium.Builder()
        .withCapabilities(selenium.Capabilities.chrome())
        .build();

    try {
        await driver.get('http://localhost:3000/?hash=045');
        //await sleep(5000);
        await driver.wait(async function() {
            const state = await driver.executeScript(`return (window[Symbol.for('MyIsLoaded')] === 0)`);
            console.log(state);
            return state;
        }, 30000);
        const data = await driver.takeScreenshot();
        const base64Data = data.replace(/^data:image\/png;base64,/, "");
        await (async function () {
            new Promise((res, rej) => {
                const p = path.resolve(path.join(__dirname, "..", "..", "client", "public", "out.png"));
                console.log(p)
                fs.writeFile(p, base64Data, 'base64', (err) => { rej(err) });
            });
        })()
        console.log(`PWD: ${process.env.PWD}`);
        console.log(`path to img: ${path.resolve(path.join(__dirname, "..", "..", "client", "public", "out.png"))}`);
        driver.quit();
    } catch (err) {
        console.error(err);
        driver.quit();
    }
}

module.exports = {
    getScreenshot
}








