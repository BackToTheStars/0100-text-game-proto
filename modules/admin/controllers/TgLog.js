const { ALL_LOG_TYPES } = require('../../../config/logs');
const TelegramUser = require('../../bot/models/TelegramUser');
const TgLog = require('../models/TgLog');

const getLogTypes = async (req, res) => {
  try {
    res.json({ types: ALL_LOG_TYPES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getChatIds = async (req, res) => {
  try {
    const chatIds = await TelegramUser.aggregate([
      {
        $match: {
          games: { $exists: true, $type: 'array' }, // Фильтруем документы, где games — массив
        },
      },
      {
        $project: {
          userId: 1,
          gamesCount: { $size: '$games' },
        },
      },
      {
        $sort: { gamesCount: -1 },
      },
      {
        $project: { userId: 1 },
      },
    ]);
    res.json({ items: chatIds.map(({ userId }) => userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const { chatId, type, start, end, page = 1, limit = 100 } = req.query;
    const limitNumber = parseInt(limit);

    // Фильтры
    const filters = {};

    // Фильтр по chatId (из metadata)
    if (chatId) {
      filters['metadata.chatId'] = parseInt(chatId, 10);
    }

    // Фильтр по type (из metadata)
    if (type) {
      filters['metadata.type'] = type;
    }

    // Фильтр по дате (из timestamp)
    if (start || end) {
      filters.timestamp = {};
      if (start) {
        filters.timestamp.$gte = new Date(start);
      }
      if (end) {
        filters.timestamp.$lte = new Date(end);
      }
    }

    // Пагинация
    const skip = (page - 1) * limitNumber;

    // Запрос к базе данных
    const logs = await TgLog.find(filters)
      .sort({ 'metadata.timestamp': 1 }) // Сортировка по возрастанию времени
      .skip(skip)
      .limit(limitNumber)
      .exec();

    // Общее количество документов
    const total = await TgLog.countDocuments(filters);

    // Преобразуем logs, чтобы включить parsedMessage
    const formattedLogs = logs.map((log) => {
      const logObject = log.toJSON(); // Преобразуем документ Mongoose в объект
      const metadata = log.metadata || {};
      return {
        ...logObject,
        ...log.parsedMessage,
        parsedMessage: undefined,
        ...metadata,
      };
    });

    res.json({
      items: formattedLogs,
      total,
      page: page,
      limit: limitNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getLogTypes,
  getChatIds,
  getLogs,
};
