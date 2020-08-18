const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  header: {
    type: String,
    required: true,
  },
  paragraph: {
    type: String,
    required: true,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Turn", schema, "turns");
