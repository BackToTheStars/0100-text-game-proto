const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config.json');

const schema = new Schema({
  id: {
    type: String,
    required: true,
  },
  gameClass: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('GameClass', schema, config.mongo.collections.classes);

