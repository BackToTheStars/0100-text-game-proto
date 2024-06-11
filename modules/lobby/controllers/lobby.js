const mongoose = require('mongoose');
const Turn = require('../../game/models/Turn');
const Game = require('../../game/models/Game');
const { getHashByGame, getInfo } = require('../../game/services/security');

const getCodesInfo = (codes) => {
  return codes
    .split(',')
    .map((str) => str.split(':'))
    .map(([hash, code]) => ({
      hash,
      code,
    }));
};

const getGameIdsByCodesInfo = async (codesInfo) => {
  const hashes = codesInfo.map((c) => c.code);
  const games = await Game.find({
    'codes.hash': { $in: hashes },
  });
  return games.map((g) => g._id);
};

const fields = {
  name: true,
  public: true,
  description: true,
  image: true,
  turnsCount: true,
  newTurnsCount: true,
  image: true,
};

const getGames = async (req, res, next) => {
  try {
    const { codes = '' } = req.query;
    const codesInfo = getCodesInfo(codes);

    if (!codesInfo.length) {
      const games = await Game.find({ public: true }, fields).sort({
        updatedAt: -1,
      });
      res.json({ items: games });
      return;
    }

    const gameIds = await getGameIdsByCodesInfo(codesInfo);

    const criteria = {
      $or: [
        {
          public: true,
        },
        {
          _id: {
            $in: gameIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      ],
    };
    const games = await Game.find(criteria, fields).sort({ updatedAt: -1 });
    res.json({
      items: games.map((g) => ({
        ...g.toObject(),
        hash: getHashByGame(g),
      })),
    });
  } catch (err) {
    next(err);
  }
};

const getTurns = async (req, res, next) => {
  try {
    const {
      skip = 0,
      limit = 100,
      mode = 'chrono', // or 'byGame'
      //   byGameLimit = 0,
      codes = '',
    } = req.query;

    const codesInfo = getCodesInfo(codes);
    const gameIds = await getGameIdsByCodesInfo(codesInfo);
    const criteria = {
      $or: [
        {
          public: true,
        },
        {
          _id: {
            $in: gameIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      ],
    };
    const games = await Game.find(criteria, fields).sort({ updatedAt: -1 });
    const allGameIds = games.map((game) => game._id);

    if (mode === 'chrono') {
      const items = await Turn.find({
        gameId: { $in: allGameIds },
        contentType: { $nin: ['zero-point'] },
      })
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 });
      res.json({ items });
      return;
    } else if (mode === 'byGame') {
      const { gameLimit = 25, turnLimit = 3 } = req.query;

      const pipe = [
        {
          $match: { _id: { $in: allGameIds } },
        },
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
                // $match: {
                //   contentType: {
                //     $ne: 'zero-point',
                //   },
                // },
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
            preserveNullAndEmptyArrays: true,
          },
        },
      ];
      const gameItems = await Game.aggregate(pipe);
      // for (const item of gameItems) {
      //   console.log(item._id)
      // }
      res.json({
        items: gameItems
          // .filter((game) => game.turns.contentType !== 'zero-point')
          .map((item) => {
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

const getGamesByHashes = async (req, res, next) => {
  try {
    const { hashes } = req.query;
    const arrHashes = hashes.split(',');
    const ids = [];
    const notFoundHashes = [];
    for (const hash of arrHashes) {
      const gameInfo = await getInfo(hash);
      if (gameInfo.gameId) {
        ids.push(gameInfo.gameId);
      } else {
        notFoundHashes.push(hash);
      }
    }
    const games = await Game.find({ _id: { $in: ids }, accessLevel: 'link' }, fields);
    res.json({
      items: games.map((g) => ({ ...g.toObject(), hash: getHashByGame(g) })),
      notFoundHashes,
    });
  } catch (error) {
    next(error);
  }
};

const checkGame = async (req, res, next) => {
  try {
    const { hash } = req.query;
    const gameInfo = await getInfo(hash);
    res.json({ item: gameInfo });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTurns,
  getGames,
  getGamesByHashes,
  checkGame,
};
