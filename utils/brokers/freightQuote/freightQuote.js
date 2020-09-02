const selectors = require('./selectors.json');
const utils = require('./utils.js');
const url = 'https://www.freightquote.com/book/#/single-page-quote';

const BROKER_CODE = 'freightquote.com' // TODO Как экспортировать код в deploy для модуля пупитер, чтобы в двух местах код не задавать?

/**
 * Broker adapter for freightquote.com
 * @param options
 * @param ppt
 * @param ppt.browser
 * @param ppt.page
 * @param ppt.saveScreenshot
 * @param ppt.savePdf
 * @param param
 * @param param.quote - quote
 * @param param.brokers - brokers
 * @returns {Promise<unknown>}
 */
module.exports = function (options, ppt, param) { //checkQuote
  return new Promise(async (resolve, reject) => {
    console.log((new Date).toISOString(), 'Checking quotes on', url)
    const page = await ppt.browser.newPage();
    const quote = param.quote.base;
    const broker = param.brokers.reduce((res, item) => item.base.code === BROKER_CODE ? item.base : res ? res : null, null) // Ищем объект брокера
    if(!broker)
      return reject(`Demand broker object for code '${BROKER_CODE}'`)

    let isRequestSuccess = true;
    const brokerQuoteData = {
      "broker": broker.guid,
      "logs": '',
      "quotes": param.quote.id
    }
    try {
      // await Promise.all([
      //   page.waitForNavigation(),
      //   page.goto(url)
      // ]);
      await page.goto(url, {timeout: 60000}) //, waitUntil: 'networkidle0'
      await page.waitForSelector(selectors.formGroup1, {visible: true});

      await utils.fillQuoteForm(param.quote.base, page);
      const acceptCookie = await page.$(selectors.acceptCookies)
      if (acceptCookie)
        acceptCookie.click(); // Без этого отправка кнопка отправки не срабатывает

    } catch (e) {
      brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e);
      await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteData);
      return resolve();
    }

    try {
      const reqScrn = await ppt.saveScreenshot(options, page, 'req-freightquote.png');
      if (reqScrn && reqScrn.id)
        brokerQuoteData.quotesScreenshot = reqScrn.id;
      const reqPdf = await ppt.savePdf(options, page, 'req-freightquote.pdf');
      if (reqPdf && reqPdf.id)
        brokerQuoteData.quotesPdf = reqPdf.id;
    } catch (e) {
      brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e)
    }
    try {
      const sendBtn = await page.$(selectors.submitBtn)
      if (sendBtn) {
        await sendBtn.click()
      }
      await page.waitForSelector('.emphasis-lg')
      const acceptCookiesPrompt = await page.$(selectors.acceptCookies);
      if (acceptCookiesPrompt && (await acceptCookiesPrompt.boundingBox())) await page.click(selectors.acceptCookies);
    } catch (e) {
      isRequestSuccess = false
      brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e);
    }

    if (isRequestSuccess) {
      // await utils.parseQuoteForm(page);
      // await page.waitForSelector(selectors.resultQuotes, {visible: true});
      try {
        const respScrn = await ppt.saveScreenshot(options, page, 'res-freightquote.png');
        if (respScrn && respScrn.id)
          brokerQuoteData.resultScreenshot = respScrn.id;
        const respPdf = await ppt.savePdf(options, page, 'res-freightquote.pdf');
        if (respPdf && respPdf.id)
          brokerQuoteData.resultPdf = respPdf.id;
      } catch (e) {
        brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
        console.error(e)
      }
    }
    // TODO save results.
    try {
      const brokerQuotes = await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteData);
      // results parsing
      const resultRows = await page.$$(selectors.resultsRow);
      for (const row of resultRows) {
        const carrierName = await row.$eval(selectors.carrierName, el => el.innerText);
        const guaranteedTime = await row.$(selectors.guaranteed);
        let transitTime = '';
        let transitTimeHandle = await row.$(selectors.transitTime);
        if (transitTimeHandle) {
          transitTime = await transitTimeHandle.evaluate(el => el.innerText);
          if (guaranteedTime) transitTime = 'guaranteed ' + transitTime;
        }
        else transitTime = 'unavailable'
        const quoteType = await row.$eval(selectors.quoteType, el => el.innerText);
        const transitRate = await row.$eval(selectors.transitRate, el => el.innerText);
        const resultsObj = {
          "quotes": param.quote.id,
          "brokerQuotes": brokerQuotes.id,
          "carrierName": carrierName,
          "estimated": transitTime,
          "rate": parseFloat(transitRate.substring(1).split(',').join('')),
          "quoteType": quoteType
        };
        await options.dataRepo.createItem('result@freight-quote', resultsObj);
      }
    } catch (e) {
      console.error(e);
      return reject(e)
    }
    return resolve()
  })
}
// module.exports.checkQuote = checkQuote;
