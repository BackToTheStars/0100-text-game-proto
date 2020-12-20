const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  id: {
    type: String,
    required: false
  },
  gameClass: {
    type: String,
    required: true
  },
  subClasses: {
    type: [String],
    required: false
  }
});

module.exports = mongoose.model('GameClass', schema, "classes");








