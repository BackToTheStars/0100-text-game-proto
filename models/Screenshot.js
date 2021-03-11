const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  // gameId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: true,
  // },
  data: {
    type: Buffer,
  },
  contentType: {
    type: String,
    default: 'image/png',
  },
});

module.exports = mongoose.model('Screenshot', schema, 'screenshots');
