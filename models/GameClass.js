const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  id: {
    type: String,
    required: false,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  parentId: {
    type: Number,
    required: false,
  },
});

module.exports = mongoose.model('GameClass', schema, 'classes-001');
