const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

module.exports = mongoose.model('GameClass', schema, 'gameClasses');

