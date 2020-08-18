const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config.json');

const schema = new Schema({
  header: {
    type: String,
    required: true
  },
  paragraph: {
    type: Array,
    required: true
  },
});

module.exports = mongoose.model('Turn', schema, config.mongo.collections.turns);












