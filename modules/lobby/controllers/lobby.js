const Turn = require('../../../models/Turn');
const Game = require('../../../models/Game');

const getTurns = async (req, res, next) => {
  try {
    const {
      skip = 0,
      limit = 100,
      mode = 'chrono', // or 'byGame'
      //   byGameLimit = 0,
    } = req.query;

    if (mode === 'chrono') {
      const items = await Turn.find()
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 });
      res.json({ items });
      return;
    } else if (mode === 'byGame') {
      const { gameLimit = 25, turnLimit = 3 } = req.query;

      const pipe = [
        {
          $limit: +gameLimit,
        },
        {
          $project: {
            _id: true,
            name: true,
            codes: true,
            image: true,
            description: true,
            turnsCount: true,
          },
        },
        {
          $lookup: {
            from: 'turns',
            as: 'turns',
            let: {
              indicator_id: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$gameId', '$$indicator_id'],
                    // $ne: ['$contentType', 'zero-point']
                  },
                },
              },
              {
                $limit: +turnLimit,
              },
            ],
          },
        },
        {
          $unwind: {
            path: '$turns',
          },
        },
      ];
      const gameItems = await Game.aggregate(pipe);
      res.json({
        items: gameItems.filter((game)=>game.turns.contentType !== 'zero-point').map((item) => {
          return item.turns;
        }),
      });
      return;
    }

    res.json({ items: [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTurns,
};
