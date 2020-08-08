const selectors = require('./selectors.json');
const utils = require('./utils.js');
const url = 'https://www.freightquote.com/book/#/single-page-quote';

const fs = require('fs')
const path = require('path')

async function checkQuote(options, page, quote) {
  console.log('анализ ', url)
  let logs = '';
  const scr = {req: null, reqPdf: null, quote: null, quotePdf: null}
  const promiseFilesToUpload = [];
  let isRequestSuccess = true;
  try {
    // await Promise.all([
    //   page.waitForNavigation(),
    //   page.goto(url)
    // ]);

    await page.goto(url, {timeout: 30000}) //, waitUntil: 'networkidle0'
    await page.waitForSelector(selectors.formGroup1, {visible: true});
    await utils.fillQuoteForm(quote, page);

  } catch(e) {
    logs = `${logs}\n${e.code}: ${e.message}`
    isRequestSuccess = false
    console.error(e);
  }

  try {
    await page.screenshot({path: path.join(__dirname,'request.png'), fullPage: true});
    scr.req = await options.dataRepo.fileStorage.accept({name: 'request.png', buffer: fs.readFileSync(`${path.join(__dirname,'request.png')}`)})
    promiseFilesToUpload.push(options.dataRepo.fileStorage.accept({name: 'request.png', buffer: fs.readFileSync(`${path.join(__dirname,'request.png')}`)}))
    console.log('request screenshot saved in request.png');
    scr.reqPdf =  await page.pdf({path: path.join(__dirname,'request.pdf'), fullPage: true});
    promiseFilesToUpload.push(options.dataRepo.fileStorage.accept({name: 'request.pdf', buffer: fs.readFileSync(`${path.join(__dirname,'request.pdf')}`)}))
    console.log('request pdf saved in request.pdf');
  } catch(e) {
    logs = `${logs}\n${e.code}: ${e.message}`
    console.error(e)
  }


  try {
    await Promise.all([
      page.waitForNavigation(),
      page.click(selectors.submitBtn)
    ]);
  } catch(e) {
    isRequestSuccess = false
    logs = `${logs}\n${e.code}: ${e.message}`
    console.error(e);

  }
  if(isRequestSuccess) {
  // await utils.parseQuoteForm(page);
  // await page.waitForSelector(selectors.resultQuotes, {visible: true});
  // const acceptCookiesPrompt = await page.$(selectors.acceptCookies);
  // if (acceptCookiesPrompt) await page.click(selectors.acceptCookies);
  // await page.screenshot({path: path.join(__dirname,'quotes.png'), fullPage: true});
    // promiseFilesToUpload.push(options.dataRepo.fileStorage.accept({name: 'quotes.png', buffer: fs.readFileSync(`${path.join(__dirname,'quotes.png')}`, dir)}))

  // console.log('result screenshot saved in quotes.png');
  // await page.pdf({path: path.join(__dirname,'quotes.pdf'), fullPage: true});
    // promiseFilesToUpload.push(options.dataRepo.fileStorage.accept({name: 'quotes.pdf', buffer: fs.readFileSync(`${path.join(__dirname,'quotes.pdf')}`, dir)}))
  // console.log('result pdf saved in quotes.pdf');
  }

  try {
    const createdFiles = Promise.all(promiseFilesToUpload);
    const brokerQuoteData = {
      "logs" : logs,
      "quotes" : quote.id,
      "quotesScreenshot" : scr.req ? scr.req.id : null,
      "quotesPdf" : scr.reqPdf  ? scr.reqPdf.id : null,
      "resultScreenshot" : scr.quote ? scr.quote.id : null,
      "resultPdf" : scr.quotePdf ? scr.quotePdf.id : null,
    }
    const brokeQuotes = await options.dataRepo.createItem('brokerQuotes@freight-quote-automation', brokerQuoteData)
    console.log(brokeQuotes)
  } catch(e) {
    console.error(e);
  }
}
module.exports.checkQuote = checkQuote;
