const { getError } = require('./errors');

// Express 4 разбирает повторенный query-параметр (?hashes=a&hashes=b) в
// массив вместо строки — .split(',') на нём бросает TypeError и уходит в 500.
const requireCsvString = (value, paramName) => {
  if (typeof value !== 'string') {
    throw getError(
      `Параметр «${paramName}» должен быть строкой, а не списком`,
      400
    );
  }
  return value;
};

module.exports = {
  requireCsvString,
};
