const express = require('express');
const app = module.exports = express();
const path = require('path');
const cors = require('cors');
const { cacheMaxAge } = require('./config');
const harvestData = require('./functions');


if (process.env.NODE_ENV == 'development') {
  app.use(cors());
}

app.use(express.static('public'));

app.get('/api', (req, res) => {
  try {
    if (!req.app.locals.collection) return res.status(503).end();
    res.set('Cache-Control', 'max-age=' + cacheMaxAge);
    res.send(req.app.locals.collection);
  } catch (err) {
    console.log(err);
    res.set('Cache-Control', 'no-cache');
    res.status(500).end();
  }
});

app.all('*', (req, res) => {
  const index = path.resolve(__dirname, 'public', 'index.html')
  res.sendFile(index);
});

app.listen(8888, () => {
  console.log('Server listening on port 8888');
  harvestData();
});
