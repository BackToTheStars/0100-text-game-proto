const selenium = require('selenium-webdriver');
const fs = require('fs');

const seleniumCapabilities = {
    'os_version': '10'
    'resolution': '1920x1080',
    'browserName': 'Chrome',
    'os': 'Windows',
    'name': 'screenshooter',
    'build': 'none',
    'browserstack.user': 'USERNAME',
    'browserstack.key': 'TOCKEN',
};

function getScreenshot() {
    const driver = new selenium.Builder()
    .forBrowser('chrome')
    .build();

    driver.get('http://localhost:3000/?hash=045')
    .then(() => {
        driver.takeScreenshot()
        .then((data) => {
            const base64Data = data.replace(/^data:image\/png;base64,/, "");
            fs.writeFile("out.png", base64Data, 'base64', (err) => {
                if (err) console.error(err);
            })
        })
    });
}