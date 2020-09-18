const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const config = require('../config.json');

const schema = new Schema({
    header: {
        type: String,
        required: true,
    },
    paragraph: {
        type: [mongoose.Schema.Types.Mixed],
        required: true
    },
    x: {
        type: Number,
        default: 0,
    },
    y: {
        type: Number,
        default: 0,
    },
    height: {
        type: Number,
        required: true,
    },
    width: {
        type: Number,
        required: true,
    },
    contentType: {
        type: String,
        required: true,
    },
    imageUrl: {
        type: String,
        required: false,
    }
});

module.exports = mongoose.model('Turn', schema, config.mongo.collections.turns);

