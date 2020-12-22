const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  id: {
    type: String,
    required: false
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
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








