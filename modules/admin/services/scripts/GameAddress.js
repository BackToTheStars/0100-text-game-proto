const Game = require('../../../game/models/Game');
const { clearGamesCache } = require('../../../game/services/security');

// Адрес, который сервер до поля hash вычислял из _id. Единственное место,
// где формула ещё нужна: проставить поле играм, созданным до него.
const legacyAddressFromId = (_id) => ('' + _id).slice(-3);

// Решение по каждой игре без адреса: проставить вычисленный или пропустить,
// если он занят другой игрой — её адресом, её кодом или таким же хвостом _id.
// Свой код посетителя не мешает: у публичной игры он и равен адресу.
const planAddresses = (games) => {
  const claims = new Map();
  const claim = (value, id) => {
    if (!value) {
      return;
    }
    if (!claims.has(value)) {
      claims.set(value, new Set());
    }
    claims.get(value).add(id);
  };
  for (const game of games) {
    const id = '' + game._id;
    claim(game.hash, id);
    for (const code of game.codes || []) {
      claim(code.hash, id);
    }
  }
  const missing = games.filter((game) => !game.hash);
  for (const game of missing) {
    claim(legacyAddressFromId(game._id), '' + game._id);
  }

  const assign = [];
  const skipped = [];
  for (const game of missing) {
    const id = '' + game._id;
    const hash = legacyAddressFromId(game._id);
    const takenBy = [...claims.get(hash)].filter((other) => other !== id);
    if (takenBy.length) {
      skipped.push({ _id: id, hash, takenBy });
    } else {
      assign.push({ _id: id, hash });
    }
  }
  return { missing: missing.length, assign, skipped };
};

const describeSkipped = (skipped) =>
  skipped.map(
    ({ _id, hash, takenBy }) =>
      `skip ${_id}: address ${hash} is taken by ${takenBy.join(', ')}`
  );

const loadGames = () => Game.find().select({ hash: 1, 'codes.hash': 1 }).lean();

const check = async () => {
  const games = await loadGames();
  const { missing, assign, skipped } = planAddresses(games);
  return [
    true,
    [
      `${games.length} games, ${games.length - missing} with an address`,
      `${missing} games without an address: ${assign.length} to assign, ${skipped.length} to skip`,
      ...describeSkipped(skipped),
    ],
  ];
};

const run = async () => {
  const games = await loadGames();
  const { assign, skipped } = planAddresses(games);
  let assigned = 0;
  const failed = [];
  for (const { _id, hash } of assign) {
    try {
      const result = await Game.updateOne(
        { _id, hash: { $exists: false } },
        { $set: { hash } }
      );
      assigned += result.modifiedCount;
    } catch (err) {
      failed.push(`failed ${_id}: ${err.message}`);
    }
  }
  clearGamesCache();
  return [
    failed.length === 0,
    [
      `${assigned} games got an address`,
      `${skipped.length} games skipped`,
      ...describeSkipped(skipped),
      ...failed,
    ],
  ];
};

module.exports = {
  legacyAddressFromId,
  planAddresses,
  check,
  run,
};
