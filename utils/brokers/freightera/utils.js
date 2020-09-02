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
  const [, state, code] = /(?:(\w+)\s+)?(\d+)/.exec(postcode);
  //return `${state}, ${code}`;
  return `${code}`;
}

async function fillLTLForm(quote, page) {

  const temp = quote.loadingDate.toISOString().substring(0,10).split("-");
  const reqDate = `${temp[1]}/${temp[2]}/${temp[0]}`;
  await page.$eval(selectors.requestLoadingDate, (el, loadDate) => el.value = loadDate ? loadDate : el.value, reqDate);
  await page.select(selectors.freightClass, quote.freightClass);
  await page.waitForSelector(selectors.pickupCityOrPostalCode, {visible: true});
  await page.type(selectors.pickupCityOrPostalCode, postcodeToVal(quote.pickup));
  try {
    await page.waitForSelector(selectors.pickupFormatProposal, {visible: true});
    await page.click(selectors.pickupFormatProposal);
  } catch (e) {
    throw new Error('Departure location is not found.');
  }
  const pickupLocationCheck = await page.$eval(selectors.pickupCityOrPostalCode, el => el.value);
  if (!pickupLocationCheck.includes(postcodeToVal(quote.pickup)))
    throw new Error('Departure location is not found.');
  await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});
  await page.type(selectors.deliveryCityOrPostalCode, postcodeToVal(quote.delivery));
  try {
    await page.waitForSelector(selectors.deliveryFormatProposal, {visible: true});
    await page.click(selectors.deliveryFormatProposal);
  } catch (e) {
    throw new Error('Arrival location is not found.');
  }
  const deliveryLocationCheck = await page.$eval(selectors.deliveryCityOrPostalCode, el => el.value);
  if (!deliveryLocationCheck.includes(postcodeToVal(quote.delivery)))
    throw new Error('Arrival location is not found.');
  await clearAndFill(page, selectors.itemDescription, quote.description);
  await page.select(selectors.packaging, packagingTypeVal(quote.packageType));
  let length, width;
  if (quote.length && quote.width) {
    length = quote.length;
    width = quote.width;
  } else {
    const dimensions = /[A-Za-z]+([0-9]+)x([0-9]+)/.exec(quote.packageType);
    if (!dimensions) throw new Error(`dimensions can not be deduced from packageType: ${quote.packageType}`);
    [, length, width] = dimensions;
  }
  await clearAndFill(page, selectors.palletLength, length);
  await clearAndFill(page, selectors.palletWidth, width);
  await clearAndFill(page, selectors.palletHeight, quote.height);
  await clearAndFill(page, selectors.weight, quote.weight);
  await clearAndFill(page, selectors.quantity, quote.quantity);
}
module.exports.fillLTLForm = fillLTLForm;

async function fillFTLForm(quote, page) {

  const temp = quote.loadingDate.toISOString().substring(0,10).split("-");
  const reqDate = `${temp[1]}/${temp[2]}/${temp[0]}`;
  await page.$eval(selectors.requestLoadingDate, (el, loadDate) => el.value = loadDate ? loadDate : el.value, reqDate);
  // await page.click(selectors.flexibleCheckbox);
  await page.waitForSelector(selectors.pickupCityOrPostalCode, {visible: true});
  await page.type(selectors.pickupCityOrPostalCode, postcodeToVal(quote.pickup));
  try {
    await page.waitForSelector(selectors.pickupFormatProposal, {visible: true});
    await page.click(selectors.pickupFormatProposal);
  } catch (e) {
    throw new Error('Departure location is not found.');
  }
  await page.waitForSelector(selectors.deliveryCityOrPostalCode, {visible: true});
  await page.type(selectors.deliveryCityOrPostalCode, postcodeToVal(quote.delivery));
  try {
    await page.waitForSelector(selectors.deliveryFormatProposal, {visible: true});
    await page.click(selectors.deliveryFormatProposal);
  } catch (e) {
    throw new Error('Arrival location is not found.');
  }
  await clearAndFill(page, selectors.itemDescription, quote.description);
  await page.select(selectors.packaging, packagingTypeVal(quote.packageType));
  await clearAndFill(page, selectors.weight, quote.weight*quote.quantity);
  await clearAndFill(page, selectors.quantity, quote.quantity);
}
module.exports.fillFTLForm = fillFTLForm;
