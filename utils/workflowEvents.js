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
                if (quoteItem.base['brokers'] && quoteItem.base['brokers'].length !== 0) {
                  const brokersPromises = quoteItem.base['brokers']
                    .map(brokerId => options.dataRepo.getItem('broker@freight-quote', brokerId).then(item => {
                      if (item.base.isActive)  // Проверяем, что  брокер активен
                        return item
                      else return null
                    }))
                  Promise.all(  // TODO Что делать с логами, если сбой на уровне пупитера, а не теста. Куда их положить? отдельное поле лога в quote?
                    brokersPromises)
                    .then(brokerItems => {
                      brokerItems = brokerItems.filter(item => Boolean(item)) // Может быть null, если брокер не активен
                      const codes = brokerItems.map(item => item.base.code)
                      if (codes && codes.length > 0)
                        // TODO Или здесь определять вместо модуля, тогда его функционал какой? - запускать по очереди, или по одному?
                        return puppeteerExec(options, 'brokers', codes,{quote: quoteItem, brokers: brokerItems})
                      else reject('There are no activated brokers for sending requests')
                    })
                    .then(resolve)
                    .catch(reject)
                } else { // Если не заданы брокеры - то все активные запускаем
                  options.dataRepo.getList('broker@freight-quote', {'isActive': true})
                    .then(brokerItems => {
                      const codes = brokerItems.map(item => item.base.code)
                      if (codes && codes.length > 0)
                        // TODO Или здесь определять вместо модуля, тогда его функционал какой? - запускать по очереди, или по одному?
                        return puppeteerExec(options, 'brokers', codes,{quote: quoteItem, brokers: brokerItems})
                      else reject('There are no activated brokers for sending requests')
                    })
                    .then(resolve)
                    .catch(reject)

                }
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