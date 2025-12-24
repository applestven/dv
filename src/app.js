const express = require('express');
const downloadRoutes = require('./api/download.routes');

const app = express();
app.use(express.json());

app.use('/', downloadRoutes);

module.exports = app;
