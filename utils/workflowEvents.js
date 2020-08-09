const {puppeteerExec} = require('./puppeteer.js');

function workflowEvents(options) {
  this.init =function () {
    options.workflows.on(
      ['quotes@freight-quote.sent'],
      async (ev) => {
        if (ev.transition === 'send') {
          return new Promise((resolve, reject) => {
            options.dataRepo.getItem(ev.item, null, {})
              .then((quoteItem) => {
                Promise.all(  // TODO Что делать с логами, если сбой на уровне пупитера, а не теста. Куда их положить? отдельное поле лога в quote?
                  quoteItem.base['brokers']
                    .map(brokerId => options.dataRepo.getItem('broker@freight-quote', brokerId, {})))
                  .then(brokerItems => {
                    const codes = brokerItems.map(item => item.base.code)
                    // TODO Или здесь определять вместо модуля, тогда его функционал какой? - запускать по очереди, или по одному?
                    return puppeteerExec(options, 'brokers', codes,{quote: quoteItem, brokers: brokerItems}) // TODO brokers попадают все, хотя по идее брокеру нужно только его значение. Как-то фильтровать надо в модуле?
                  })
                  .then(resolve)
                  .catch(reject)
              })
              .catch(reject);
          });
        } else {
          return Promise.resolve();
        }
      }
    )
  }
}
module.exports = workflowEvents;