const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  gameClass: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  subClasses: {
    type: [String],
    required: false,
  },
});

module.exports = mongoose.model('GameClassOld', schema, 'classes');
