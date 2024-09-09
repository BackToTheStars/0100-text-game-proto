const Log = require('../../core/models/Log');

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

    // if (searchText) {
    //   criteria.$or = [
    //     { name: { $regex: searchText, $options: 'i' } },
    //     { description: { $regex: searchText, $options: 'i' } },
    //   ];
    // }

    const items = await Log.find(criteria)
      .skip(+skip)
      .limit(+limit)
      .sort({ [sort]: sortDir === 'asc' ? 1 : -1 });

    const count = await Log.countDocuments(criteria);
    res.json({
      count,
      items,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { list };
