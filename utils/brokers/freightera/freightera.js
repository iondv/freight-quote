const selectors = require('./selectors.json');
const utils = require('./utils.js');
const urlLTL = 'https://www.freightera.com/en/freight-shippers/quote?lane_type=LTL';
const urlFTL = 'https://www.freightera.com/en/freight-shippers/quote?lane_type=FTL';
const resultsTimeout = 120000;

const BROKER_CODE = 'freightera.com' // TODO Как экспортировать код в deploy для модуля пупитер, чтобы в двух местах код не задавать?

/**
 * Broker adapter for freightera.com
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
module.exports = function (options, ppt, param) {
  return new Promise(async (resolve, reject) => {
    console.log((new Date).toISOString(), 'Checking quotes on', urlLTL)
    const page = await ppt.browser.newPage();
    const broker = param.brokers.reduce((res, item) => item.base.code === BROKER_CODE ? item.base : res ? res : null, null) // Ищем объект брокера
    if(!broker)
      return reject(`Demand broker object for code '${BROKER_CODE}'`)

    let isLTLRequestSuccess = true;
    const brokerQuoteDataLTL = {
      "broker": broker.guid,
      "logs": '',
      "quotes": param.quote.id
    }
    try {
      await page.goto(urlLTL, {timeout: 30000}) //, waitUntil: 'networkidle0'
      await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});

      await utils.fillLTLForm(param.quote.base, page);

    } catch (e) {
      brokerQuoteDataLTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e);
      await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataLTL);
      return resolve();
    }

    try {
      console.log('1');
      const reqScrn = await ppt.saveScreenshot(options, page, 'req-freightera.png');
      console.log('2');
      if (reqScrn && reqScrn.id)
        brokerQuoteDataLTL.quotesScreenshot = reqScrn.id;
      console.log('3');
      const reqPdf = await ppt.savePdf(options, page, 'req-freightera.pdf');
      console.log('4');
      if (reqPdf && reqPdf.id)
        brokerQuoteDataLTL.quotesPdf = reqPdf.id;
      console.log('5');
    } catch (e) {
      brokerQuoteDataLTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e)
    }
    try {
      const acceptCookies = await page.$(selectors.acceptCookies);
      if (acceptCookies) await acceptCookies.click();
      await page.click(selectors.submitBtn);
      await Promise.race([
        page.waitForSelector(selectors.resultQuotes, {timeout: resultsTimeout, visible: true}),
        page.waitForSelector(selectors.modalButtons, {timeout: resultsTimeout, visible: true}),
        page.waitForSelector(selectors.paidFeatureParcel, {timeout: resultsTimeout, visible: true})
      ]);
      const parcelPrompt = await page.$(selectors.paidFeatureParcel);
      let parcelPromptText;
      if (parcelPrompt)
        parcelPromptText = await parcelPrompt.$eval(selectors.parcelModalLabel, el => el.innerText);
      if (parcelPrompt && parcelPromptText.includes('PAID FEATURE')) {
        const error = new Error('Freightera: Parcel service quotes is a paid feature.');
        console.error(error);
        brokerQuoteDataLTL.logs += `${error.code ? error.code + ' ' + error.message : error.message}\n`;
        await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataLTL);
        return resolve();
      }
      const modalWindow = await page.$(selectors.modalLabel);
      let modalWindowText;
      if (modalWindow)
        modalWindowText = await modalWindow.evaluate(el => el.innerText);
      if (modalWindow && modalWindowText.includes('quote is unavailable')) {
        const error = new Error('Freightera: Automated quote is not available for these request parameters.');
        console.error(error);
        brokerQuoteDataLTL.logs += `${error.code ? error.code + ' ' + error.message : error.message}\n`;
        await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataLTL);
        return resolve();
      }
      await page.waitForSelector(selectors.loader, {hidden: true, timeout: resultsTimeout});
    } catch (e) {
      isLTLRequestSuccess = false
      brokerQuoteDataLTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e);
    }
    if (isLTLRequestSuccess) {
      try {
        const respScrn = await ppt.saveScreenshot(options, page, 'res-freightera.png');
        if (respScrn && respScrn.id)
          brokerQuoteDataLTL.resultScreenshot = respScrn.id;
        const respPdf = await ppt.savePdf(options, page, 'res-freightera.pdf');
        if (respPdf && respPdf.id)
          brokerQuoteDataLTL.resultPdf = respPdf.id;
      } catch (e) {
        brokerQuoteDataLTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
        console.error(e)
      }
      try {
        const brokerQuotes = await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataLTL);
        const resultRows = await page.$$(selectors.resultsRow);
        for (const row of resultRows) {
          const carrierName = await row.$eval(selectors.carrierName, el => el.innerText);
          let transitTime = await page.$eval(selectors.transitTime, el => el.innerText);
          const quoteType = 'LTL';
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
        return reject(e);
      }
    }

    console.log((new Date).toISOString(), 'Checking quotes on', urlFTL);
    let isFTLRequestSuccess = true;
    const brokerQuoteDataFTL = {
      "broker": broker.guid,
      "logs": '',
      "quotes": param.quote.id
    }
    try {
      await page.goto(urlFTL, {timeout: 30000}) //, waitUntil: 'networkidle0'
      await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});

      await utils.fillFTLForm(param.quote.base, page);

    } catch (e) {
      brokerQuoteDataFTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      isFTLRequestSuccess = false
      console.error(e);
    }
    try {
      const reqScrn = await ppt.saveScreenshot(options, page, 'req-freightera.png');
      if (reqScrn && reqScrn.id)
        brokerQuoteDataFTL.quotesScreenshot = reqScrn.id;
      const reqPdf = await ppt.savePdf(options, page, 'req-freightera.pdf');
      if (reqPdf && reqPdf.id)
        brokerQuoteDataFTL.quotesPdf = reqPdf.id;
    } catch (e) {
      brokerQuoteDataFTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e)
      return reject(e);
    }
    try {
      const acceptCookies = await page.$(selectors.acceptCookies);
      if (acceptCookies)
        await acceptCookies.click()
      const sendBtn = await page.$(selectors.submitBtn)
      if (sendBtn) {
        await sendBtn.click()
      }
      await Promise.race([
        page.waitForSelector(selectors.resultQuotes, {timeout: resultsTimeout, visible: true}),
        page.waitForSelector(selectors.modalButtons, {timeout: resultsTimeout, visible: true}),
        page.waitForSelector(selectors.paidFeatureParcel, {timeout: resultsTimeout, visible: true})
      ]);
      const parcelPrompt = await page.$(selectors.paidFeatureParcel);
      let parcelPromptText;
      if (parcelPrompt)
        parcelPromptText = await parcelPrompt.$eval(selectors.parcelModalLabel, el => el.innerText);
      if (parcelPrompt && parcelPromptText.includes('PAID FEATURE')) {
        const error = new Error('Freightera: Parcel service quotes is a paid feature.');
        console.error(error);
        brokerQuoteDataFTL.logs += `${error.code ? error.code + ' ' + error.message : error.message}\n`;
        await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataFTL);
        return resolve();
      }
      const modalWindow = await page.$(selectors.modalLabel);
      let modalWindowText;
      if (modalWindow)
        modalWindowText = await modalWindow.evaluate(el => el.innerText);
      if (modalWindow && modalWindowText.includes('quote is unavailable')) {
        const error = new Error('Freightera: Automated quote is not available for these request parameters.');
        console.error(error);
        brokerQuoteDataFTL.logs += `${error.code ? error.code + ' ' + error.message : error.message}\n`;
        await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataFTL);
        return resolve();
      }
      await page.waitForSelector(selectors.loader, {hidden: true, timeout: resultsTimeout});
    } catch (e) {
      isFTLRequestSuccess = false
      brokerQuoteDataFTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
      console.error(e);
    }
    if (isFTLRequestSuccess) {
      try {
        const respScrn = await ppt.saveScreenshot(options, page, 'res-freightera.png');
        if (respScrn && respScrn.id)
          brokerQuoteDataFTL.resultScreenshot = respScrn.id;
        const respPdf = await ppt.savePdf(options, page, 'res-freightera.pdf');
        if (respPdf && respPdf.id)
          brokerQuoteDataFTL.resultPdf = respPdf.id;
      } catch (e) {
        brokerQuoteDataFTL.logs += `${e.code ? e.code + ' ' + e.message : e.message}\n`
        console.error(e)
      }
      try {
        const brokerQuotes = await options.dataRepo.createItem('brokerQuotes@freight-quote', brokerQuoteDataFTL);
        const resultRows = await page.$$(selectors.resultsRow);
        for (const row of resultRows) {
          const carrierName = await row.$eval(selectors.carrierName, el => el.innerText);
          let transitTime = await page.$eval(selectors.transitTime, el => el.innerText);
          const quoteType = 'FTL';
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
        return reject(e);
      }
    }
    return resolve();
  })
}
