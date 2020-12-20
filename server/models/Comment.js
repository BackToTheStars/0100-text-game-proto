const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  id: {
    type: String,
    required: true
  },
  comment: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Comment', schema, "comments");











