const fetch = require('node-fetch');
const { basePath, categories, harvestInterval } = require('./config');
const app = require('./app');


const fetchCategory = async category => {
  const url = `${basePath}/products/${category}`;
  let repeat = true;
  do {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        console.log(`[+] (200) ${url}`);
        repeat = false;
        return data;
      } else {
        console.log(`[-] (${res.status}) ${url}`);
      }
    } catch (err) {
      error = err.type && err.message
        ? `[-] (${err.errno}) ${url}`
        : err;
      console.log(error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } while (repeat);
}

const fetchManufacturerAvailability = async manufacturer => {
  const url = `${basePath}/availability/${manufacturer}`;
  let repeat = true;
  do {
    try {
      let data = {};
      const res = await fetch(url);
      data = await res.json();

      if (!data.response || data.response == '[]') {
        throw `[-] (204) ${url}`;
      }

      console.log(`[+] (200) ${url}`);
      repeat = false;
      return data;
    } catch (err) {
      error = err.type && err.message
        ? `[-] (${err.errno}) ${url}`
        : err;
      console.log(error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (repeat);
};

const fetchAllCategories = async () => {
  const data = categories.map(category => fetchCategory(category));
  const products = await Promise.all(data);
  return products;
}

const findManufacturer = (manufacturers, manufacturer) => {
  return manufacturers.find(value => value === manufacturer);
};

const extractManufacturers = (productsByCategory) => {
  const manufacturers = [];
  productsByCategory.forEach(category => {
    category.forEach(product => {
      const manufacturer = product.manufacturer;
      const manufacturerExists = findManufacturer(manufacturers, manufacturer);
      if (!manufacturerExists) manufacturers.push(manufacturer);
    });
  });
  
  return manufacturers;
}

const fetchAvailability = async (manufacturers) => {
  const data = manufacturers.map(manufacturer => {
    return fetchManufacturerAvailability(manufacturer);
  });

  const availabilityData = await Promise.all(data);
  return availabilityData;
}

const findProductAvailability = (product, availability) => {
  try {
    const manufacturerIndex = app.locals.manufacturers.indexOf(product.manufacturer)
    const manufacturerAvailability = availability[manufacturerIndex].response;

    const checkProductAvailability = productAvailability => {
      return product.id.toLowerCase() === productAvailability.id.toLowerCase();
    };

    return manufacturerAvailability.find(checkProductAvailability);
  } catch (err) {
    if (err.name === 'TypeError') return '';
  }
};

const availabilityText = productAvailability => {
  try {
    const text = productAvailability.DATAPAYLOAD;
    const regexp = new RegExp('INSTOCKVALUE>(.*)<\/INSTOCKVALUE');
    const match = text.match(regexp);
    if (match && match.length) return match[1];
  } catch (err) {
    return 'UNKNOWN';
  }
};

const addAvailabilityToProduct = (product, availability)  => {
  const productAvailability = findProductAvailability(product, availability);
  product.availability = availabilityText(productAvailability);
  return product;
};

const categoryByManufacturer = (manufacturers, productsByCategory, availability) => {
  const collection = {};
  categories.forEach(category => {
    collection[category] = {};
    manufacturers.forEach(manufacturer => { 
      collection[category][manufacturer] = [];
    });

    const categoryIndex = categories.indexOf(category);
    productsByCategory[categoryIndex].forEach(product => {
      const productWithAvailability = addAvailabilityToProduct(product, availability);
      collection[category][product.manufacturer].push(productWithAvailability);
    });
  });

  return collection;
};

const productsAsc = (a, b)  => {
  if (a.name < b.name) {
    return -1;
  } else if (a.name > b.name) {
    return 1;
  } else {
    return 0;
  }
}

const harvestData = async () => {
  try {
    const start = new Date();
    console.log('Harvesting started:', start.toLocaleTimeString());

    const productsByCategory = await fetchAllCategories();
    const manufacturers = await extractManufacturers(productsByCategory);
    app.locals.manufacturers = manufacturers;
    const availability = await fetchAvailability(manufacturers);

    const end = new Date();
    console.log('Retrieval duration:', (end - start) / 1000);
    const nextHarvestTime = new Date(end.getTime() + harvestInterval);
    console.log('Next harvest:', nextHarvestTime.toLocaleTimeString());

    const collection = await categoryByManufacturer(manufacturers, productsByCategory, availability);
    collection.time = end.getTime();
    app.locals.collection = collection;
  } catch (err) {
    console.log('Error harvesting data:', err);
  } finally {
    return new Promise(resolve => setTimeout(() => resolve(harvestData(app)), harvestInterval));
  }
}


module.exports = harvestData;
