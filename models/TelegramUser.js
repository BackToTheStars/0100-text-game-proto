const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    userId: {
      type: Number,
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    hash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TelegramUser', schema, 'telegram_users');
