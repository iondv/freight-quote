const {clearAndFill} = require('../../formTools');
const selectors = require('./selectors.json');

const packagingTypes = {
  "pallet48x40": "skids",
  "pallet48x48": "skids",
  "palletcustdim": "skids",
  "box": "cartons",
  "crate": "crate",
  "bundle": "bundles",
  "drum": "pieces",
  "roll": "pieces",
  "bale": "pieces"
}

function packagingTypeVal(type) {
  return packagingTypes[type.toLowerCase()];
}

function postcodeToVal(postcode) {
  const [match, state, code] = /(\w+)\s+(\d+)/.exec(postcode);
  return `${state}, ${code}`;
}

async function fillLTLForm(quote, page) {

  const temp = quote.loadingDate.toISOString().substring(0,10).split("-");
  const reqDate = `${temp[1]}/${temp[2]}/${temp[0]}`;
  await page.$eval(selectors.requestLoadingDate, (el, loadDate) => el.value = loadDate ? loadDate : el.value, reqDate);
  await page.select(selectors.freightClass, quote.freightClass);
  await page.waitForSelector(selectors.pickupCityOrPostalCode, {visible: true});
  await page.type(selectors.pickupCityOrPostalCode, postcodeToVal(quote.pickup));
  await page.waitForSelector(selectors.pickupFormatProposal, {visible: true});
  await page.click(selectors.pickupFormatProposal);
  await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});
  await page.type(selectors.deliveryCityOrPostalCode, postcodeToVal(quote.delivery));
  await page.waitForSelector(selectors.deliveryFormatProposal, {visible: true});
  await page.click(selectors.deliveryFormatProposal);
  await clearAndFill(page, selectors.itemDescription, quote.description);
  await page.select(selectors.packaging, packagingTypeVal(quote.packageType));
  await clearAndFill(page, selectors.palletLength, quote.length);
  await clearAndFill(page, selectors.palletWidth, quote.width);
  await clearAndFill(page, selectors.palletHeight, quote.height);
  await clearAndFill(page, selectors.weight, quote.weight);
  await clearAndFill(page, selectors.quantity, quote.quantity);
}
module.exports.fillLTLForm = fillLTLForm;

async function fillFTLForm(quote, page) {

  const temp = quote.loadingDate.toISOString().substring(0,10).split("-");
  const reqDate = `${temp[1]}/${temp[2]}/${temp[0]}`;
  await page.$eval(selectors.requestLoadingDate, (el, loadDate) => el.value = loadDate ? loadDate : el.value, reqDate);
  await page.click(selectors.flexibleCheckbox);
  await page.waitForSelector(selectors.pickupCityOrPostalCode, {visible: true});
  await page.type(selectors.pickupCityOrPostalCode, postcodeToVal(quote.pickup));
  await page.waitForSelector(selectors.pickupFormatProposal, {visible: true});
  await page.click(selectors.pickupFormatProposal);
  await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});
  await page.type(selectors.deliveryCityOrPostalCode, postcodeToVal(quote.delivery));
  await page.waitForSelector(selectors.deliveryFormatProposal, {visible: true});
  await page.click(selectors.deliveryFormatProposal);
  await clearAndFill(page, selectors.itemDescription, quote.description);
  await page.select(selectors.packaging, packagingTypeVal(quote.packageType));
  await clearAndFill(page, selectors.weight, quote.weight*quote.quantity);
  await clearAndFill(page, selectors.quantity, quote.quantity);
}
module.exports.fillFTLForm = fillFTLForm;
