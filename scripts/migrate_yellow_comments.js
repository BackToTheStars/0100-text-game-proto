const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

require('../models/db');
const Turn = require('../models/Turn');

// не закончили
