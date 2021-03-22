const basePath = 'https://bad-api-assignment.reaktor.com/v2';
const categories = ['gloves', 'facemasks', 'beanies'];
const harvestInterval = 1000*60*5;
const cacheMaxAge = harvestInterval / 1000;


module.exports = {
  basePath,
  categories,
  cacheMaxAge,
  harvestInterval
};
