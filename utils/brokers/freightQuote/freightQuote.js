const selectors = require('./selectors.json');
const utils = require('./utils.js');
const url = 'https://www.freightquote.com/book/#/single-page-quote';

const fs = require('fs')
const path = require('path')

const BROKER_CODE = 'freightquote.com' // TODO Как экспортировать код в deploy для модуля пупитер, чтобы в двух местах код не задавать?

/**
 * Broker adaptor for freightquote.com
 * @param options
 * @param ppt
 * @param ppt.browser
 * @param ppt.page
 * @param ppt.saveScreenshot
 * @param param
 * @param param.quote - quote
 * @param param.brokers - brokers
 * @returns {Promise<unknown>}
 */
module.exports = function (options, ppt, param) { //checkQuote
  return new Promise(async (resolve, reject) => {
    console.log('Check', url)
    const page = ppt.page;
    const quote = param.quote.base;
    const broker = param.brokers.reduce((res, item) => item.base.code === BROKER_CODE ? item.base : res ? res : null, null) // Ищем объект брокера
    if(!broker)
      return reject(`Demand broker object for code '${BROKER_CODE}'`)

    let isRequestSuccess = true;
    const brokerQuoteData = {
      "logs": '',
      "quotes": param.quote.id
    }
    try {
      // await Promise.all([
      //   page.waitForNavigation(),
      //   page.goto(url)
      // ]);
      await page.goto(url, {timeout: 30000}) //, waitUntil: 'networkidle0'
      await page.waitForSelector(selectors.formGroup1, {visible: true});
      await utils.fillQuoteForm(param.quote.base, page);

    } catch (e) {
      brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      isRequestSuccess = false
      console.error(e);
    }

    try {
      const reqScrn = await ppt.saveScreenshot(options, page, 'request-freightquote.png');
      if (reqScrn && reqScrn.id)
        brokerQuoteData.quotesScreenshot = reqScrn.id;
      const reqPdf = await ppt.savePdf(options, page, 'request-freightquote.pdf');
      if (reqPdf && reqPdf.id)
        brokerQuoteData.quotesPdf = reqPdf.id;
    } catch (e) {
      brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e)
    }

    try {
      // await Promise.all([
      //   page.waitForNavigation(),
      //   page.click(selectors.submitBtn)
      // ]);
    } catch (e) {
      isRequestSuccess = false
      brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e);
    }
    if (true || isRequestSuccess) {
      // await utils.parseQuoteForm(page);
      // await page.waitForSelector(selectors.resultQuotes, {visible: true});
      // const acceptCookiesPrompt = await page.$(selectors.acceptCookies);
      // if (acceptCookiesPrompt) await page.click(selectors.acceptCookies);

      try {
        const respScrn = await ppt.saveScreenshot(options, page, 'result-freightquote.png');
        if (respScrn && respScrn.id)
          brokerQuoteData.resultScreenshot = respScrn.id;
        const respPdf = await ppt.savePdf(options, page, 'result-freightquote.pdf');
        if (respPdf && respPdf.id)
          brokerQuoteData.resultPdf = respPdf.id;
      } catch (e) {
        brokerQuoteData.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
        console.error(e)
      }
    }
    // TODO save results.
    try {
      // console.log(brokerQuoteData)
      const brokeQuotes = await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteData)
      //console.log(brokeQuotes.base)
    } catch (e) {
      console.error(e);
      return reject(e)
    }
    return resolve()
  })
}
// module.exports.checkQuote = checkQuote;
