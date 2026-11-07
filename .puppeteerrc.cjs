const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Forces Puppeteer to save Chrome inside your project folder so Render can find it
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
