const mongoose = require('mongoose');
const { ALL_LOG_TYPES } = require('../../../config/logs');

const logSchema = new mongoose.Schema(
  {
    level: { type: String, required: true }, // Уровень логирования (info, error и т.д.)
    message: { type: String, required: true }, // Основное сообщение (JSON-строка)
    metadata: {
      type: {
        type: String,
        enum: ALL_LOG_TYPES,
      },
      chatId: {
        type: Number,
      },
      timestamp: { type: Date, default: Date.now },
    }, // Дополнительные метаданные
    timestamp: { type: Date, default: Date.now }, // Временная метка
  },
  { collection: 'bot_logs' } // Указываем имя коллекции
);

module.exports = mongoose.model('TgLog', logSchema);
