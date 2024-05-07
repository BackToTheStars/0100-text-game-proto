const Turn = require("../../../models/Turn");

const getTurnsGeometry = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const criteria = {
      gameId,
      contentType: { $ne: 'zero-point' }, // @todo: remove after zero point deleting
    };
    const turns = await Turn.find(criteria, {
      _id: true,
      x: true,
      y: true,
      width: true,
      height: true,
      contentType: true,
    });
    res.json({
      items: turns.map(({ _id, x, y, width, height, contentType }) => ({
        _id,
        contentType,
        position: {
          x,
          y,
        },
        size: {
          width,
          height,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
};

const getTurnsByIds = async (req, res, next) => {
  try {
    const { gameId } = req.gameInfo;
    const { ids } = req.query;
    const criteria = {
      gameId,
    };
    if (ids) {
      criteria._id = { $in: ids.split(',') };
    }
    const turns = await Turn.find(criteria, { x: false, y: false, width: false, height: false });
    res.json({
      items: turns,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTurnsGeometry,
  getTurnsByIds,
}