const brokersLib = require('./brokers/lib.js');

function workflowEvents(options) {
  this.init =function () {
    options.workflows.on(
      ['quotes@freight-quote-automation.sent'],
      async (ev) => {
        if (ev.transition === 'send') {
          return new Promise((resolve, reject) => {
            options.dataRepo.getItem(ev.item, null, {}).then((dbItem) => {
              const itemProps = dbItem.getProperties();
              let quote = {};
              for (const prop of Object.keys(itemProps)) {
                quote[itemProps[prop].getName()] = itemProps[prop].getValue();
              }
              for (const brokerId of quote.brokers) {
                options.dataRepo.getItem('broker@freight-quote-automation', brokerId, {}).then(async (brokerItem) => {
                  const brokerProps = brokerItem.getProperties();
                  let broker = {};
                  for (const prop of Object.keys(brokerProps)) {
                    broker[brokerProps[prop].getName()] = brokerProps[prop].getValue();
                  }
                  await brokersLib.checkQuote(options, dbItem, broker) // TODO Не ждем завершения промиза - он сам выполнит, что нужно.
                    .then((logs) => resolve(logs)) // TODO Что делать с логами, если сбой на уровне пупитера, а не теста. Куда их положить? отдельное поле лога в quote?
                    .catch((e) => {
                    });
                });
              }
            });
          });
        } else {
          console.log('status', ev.transition)
          return Promise.resolve();
        }
      }
    )
  }
}
module.exports = workflowEvents;