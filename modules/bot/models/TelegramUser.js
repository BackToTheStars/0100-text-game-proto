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
      // нужно удалить, не нужна
      type: String,
    },
    games: {
      type: [
        {
          hash: String,
          gameId: mongoose.Schema.Types.ObjectId,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TelegramUser', schema, 'telegram_users');
