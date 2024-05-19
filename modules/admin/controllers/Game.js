const Game = require('../../../models/Game');

const list = async (req, res, next) => {
  try {
    const {
      skip = 0,
      limit = 100,
      searchText = '',
      public = null,
      sort = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const criteria = {};

    if (searchText) {
      criteria.$or = [
        { name: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
      ];
    }
    if (public !== null) {
      criteria.public = public === 'true';
    }

    const items = await Game.find(criteria)
      .skip(+skip)
      .limit(+limit)
      .sort({ [sort]: sortDir === 'asc' ? 1 : -1 });

    const count = await Game.count(criteria);
    res.json({
      count,
      items,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list };
