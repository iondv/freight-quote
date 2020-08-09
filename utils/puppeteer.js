const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// TODO переделать в модуль
// TODO Два режима ожидать результатов запуска или не ожидать, просто сообщить, что запущено

const opts = { // TODO Из деплой параметры запуска браузера
  headless: process.env.NODE_ENV !== 'development',
  //defaultViewport: {
    headless: !(process.env.NODE_ENV && process.env.NODE_ENV === 'development'), // TODO надо как-то оставить режим development
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    args: ['--no-sandbox',
      '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu',
      '--ignore-certificate-errors'], //'--window-size=1920x1080'
    isMobile: false, hasTouch: false, timeout:0
  //}
};
// TODO в деплой параметры страницы
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36 Edg/84.0.522.52';

// TODO сама суть модуль - оркестровка запуска по классам или типам. Сложный вопрос.
// Сейчас параметры в объектах класса brokers, можно и из них брать. Но можно и жестко в деплой прописать ранеры
const runners = {
  'brokers': {
    'freightquote.com': './brokers/freightQuote/freightQuote.js' // TODO По идее бы код брать из самой утилиты?? иначе в двух местах надо задавать в утилите для фильтрации брокеров и здесь для подключения
  }
}

/**
 * Takes a screenshot and saves it to ion storage, returns the file ID
 */
async function saveScreenshot(options, page, name = 'screenshot.png') { // TODO на промизы перевести
  const tmpPath = path.join(__dirname, `${Math.random().toString(36).substring(2)}.png`) // TODO во временную дирректорию ИОНа сохранять
  await page.screenshot({path: tmpPath, fullPage: true});
  const buf =  fs.readFileSync(tmpPath) // TODO на асинхронное считывание
  fs.unlinkSync(tmpPath) // TODO на асинхронное удаление
  return await options.dataRepo.fileStorage.accept({
    name: name,
    buffer: buf
  })
}

/**
 * Takes a pdf and saves it to ion storage, returns the file ID
 */
async function savePdf(options, page, name = 'page.pdf') { // TODO на промизы перевести
  const tmpPath = path.join(__dirname, `${Math.random().toString(36).substring(2)}.png`) // TODO во временную дирректорию ИОНа сохранять
  await page.pdf({path: tmpPath, fullPage: true});
  const buf =  fs.readFileSync(tmpPath) // TODO на асинхронное считывание
  fs.unlinkSync(tmpPath) // TODO на асинхронное удаление
  return await options.dataRepo.fileStorage.accept({
    name: name,
    buffer: buf
  })
}

function puppeteerExec(options, type, runnerCodes, ...args) {
  return new Promise(async (resolve, reject) => {
    const pptModule = {
      logs: '',
      saveScreenshot: saveScreenshot,   // TODO options, page - можно инициализировать в функции saveScreenshot на этом этапе? и не передавать их как параметры?
      savePdf: savePdf
    }
    // TODO брать из деплой связку параметров brokers, кодов и утилит для них, когда функция будет переведена в модуль
    try {
      if(typeof type !== 'string' || !runners[type])
        reject(`There is no runners for type ${type}`)
      if(!Array.isArray(runnerCodes))
        reject(`Demand array for runnerCodes`)

      // TODO перевести на промизы
      pptModule.browser = await puppeteer.launch(opts); // TODO в зависимости от типа запуска в деплой - либо в одном браузере, либо разные браузеры для каждого раннера
      pptModule.page = await pptModule.browser.newPage(); // TODO из деплой парметры страницы обычная или инкогнито  context = await browser.createIncognitoBrowserContext() page = await context.newPage()
      await pptModule.page.setUserAgent(userAgent); // TODO парметры страницы из деплой

      const runnerPromises = runnerCodes.map(code => {
        if (!runners[type][code]){
          pptModule.logs += `There is no runners type ${type} for code ${code}\n`
          return null;
        }
        return require(runners[type][code])(options, pptModule, ...args);
      }).filter(item => Boolean(item))
      Promise.all(runnerPromises)
        .then(async res => {
          if (Array.isArray(res)) res.forEach(res => pptModule.logs += `${res}\n`)
          await pptModule.browser.close();
          return resolve(pptModule.logs)
        })
        .catch(async e => { // TODO Модуль должен как-то обрабатывать ошибку
          console.error(e);
          pptModule.logs += `${e.code}: ${e.message}\n`
          await pptModule.browser.close();
          return reject(pptModule.logs);
        })
    } catch(e) {
      console.error(e);
      pptModule.logs += `${e.code}: ${e.message}\n`
      await pptModule.browser.close();
      return reject(pptModule.logs);
    }
  });
}
module.exports.puppeteerExec = puppeteerExec;
