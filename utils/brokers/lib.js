const {puppeteerExec} = require('../puppeteer.js');

const freightQuote = require('./freightQuote/freightQuote.js');
const brokerCodes = {
  // 'freightquote.com': freightQuote
  'freightquote.com': require('./freightQuote/freightQuote.js')
}
function code2broker(code) {
  return brokerCodes[code] ? brokerCodes[code] : null;
}

function checkQuote(options, quote, broker) {
  const brokerActions = code2broker(broker.code);
  if(!brokerCodes) return;
  return new Promise((resolve, reject) => {
    puppeteerExec(options, brokerActions.checkQuote, quote)
      .then(logs => resolve(logs))
      .catch(e => {
        console.error(e);
        reject(e);
      });
  });
}
module.exports.checkQuote = checkQuote;
