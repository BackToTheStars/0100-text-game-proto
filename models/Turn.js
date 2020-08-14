const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  header: {
    type: String,
    required: true
  },
  paragraph: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Turn', schema, 'turns');

