const puppeteer = require('puppeteer');

const opts = {
  headless: process.env.NODE_ENV !== 'development',
  defaultViewport: {
    headless: !(process.env.NODE_ENV && process.env.NODE_ENV === 'development'),
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    args: ['--no-sandbox',
      '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu',
      '--ignore-certificate-errors'], //'--window-size=1920x1080'
    isMobile: false, hasTouch: false, timeout:0
  }
};
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36 Edg/84.0.522.52';

async function puppeteerExec(options, func, quote, ...args) {
  if (!func) return null;
  const browser = await puppeteer.launch(opts);
  let logs = '';
  try {
    const page = await browser.newPage();
    // const page = (await browser.pages())[0];
    await page.setUserAgent(userAgent);
    await func(options, page, quote, ...args);
  } catch(e) {
    logs = `${logs}\n${e.code}: ${e.message}`
    console.error(e);
    await browser.close();
    throw(e)
  }
  await browser.close();
  return logs;
}
module.exports.puppeteerExec = puppeteerExec;
