const Snapshot = require('../models/Snapshot');
const { TYPE_GAME, createGameSnapshot } = require('../services/snapshots');
const { getError } = require('../../core/services/errors');

const list = async (req, res, next) => {
  try {
    const {
      typeName,
      skip = 0,
      limit = 100,
      sort = 'createdAt',
      sortDir = 'desc',
    } = req.query;
    const criteria = {};
    if (typeName) {
      criteria.typeName = typeName;
    }
    const count = await Snapshot.count(criteria);
    const items = await Snapshot.find(criteria, {
      params: 1,
      createdAt: 1,
      updatedAt: 1,
      typeName: 1,
    })
      .skip(+skip)
      .limit(+limit)
      .sort({ [sort]: sortDir === 'asc' ? 1 : -1 });
    res.json({ count, items });
  } catch (err) {
    next(err);
  }
};

const createSnapshot = async (req, res, next) => {
  try {
    const { typeName = 'unknown' } = req.body;
    if (typeName === TYPE_GAME) {
      const snapshot = await createGameSnapshot(req.body.gameId);
      res.json({ item: snapshot });
    } else {
      next(getError(`Cannot create snapshot for type ${typeName}`, 400));
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  createSnapshot,
};
