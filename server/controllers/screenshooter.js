// const selenium = require('selenium-webdriver');
// const chrome = require('selenium-webdriver/chrome');
// const chromedriver = require('chromedriver');
// const fs = require('fs');

// chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

// const seleniumCapabilities = {
//     'os_version': '10',
//     'resolution': '1920x1080',
//     'browserName': 'Chrome',
//     'os': 'Windows',
//     'name': 'screenshooter',
//     'build': 'none',
//     'browserstack.user': 'USERNAME',
//     'browserstack.key': 'TOCKEN',
// };

// function getScreenshot() {
//     const driver = new selenium.Builder()
//         .withCapabilities(selenium.Capabilities.chrome())
//         .build();

//     driver.get('http://localhost:3000/?hash=045')
//         .then(() => {
//             setTimeout(5000, () => {
//                 driver.takeScreenshot()
//                     .then((data) => {
//                         const base64Data = data.replace(/^data:image\/png;base64,/, "");
//                         fs.writeFile("out.png", base64Data, 'base64', (err) => {
//                             if (err) console.error(err);
//                         })
//                         console.log(`PWD: ${process.env.PWD}`);
//                     }, (err) => { console.error(err) })
//             });
//         }, (err) => { console.error(err) });
// }

// module.exports = {
//     getScreenshot
// }








