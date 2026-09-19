const Game = require('../../../game/models/Game');
const {
  clearGamesCache,
  isUsableAddress,
} = require('../../../game/services/security');

// Адрес, который сервер до поля hash вычислял из _id. Единственное место,
// где формула ещё нужна: проставить поле играм, созданным до него.
const legacyAddressFromId = (_id) => ('' + _id).slice(-3);

// Запись идёт только в игры без поля ({ hash: { $exists: false } }): поле с
// негодным значением (null, '', не строка) она не тронет, поэтому такие игры
// не «к записи», а на разбор руками — план и отчёт считают их так же.
const ADDRESS_ABSENT = 'absent';
const ADDRESS_USABLE = 'usable';
const ADDRESS_REVIEW = 'review';

const classifyAddress = (game) => {
  if (!Object.hasOwn(game, 'hash')) {
    return ADDRESS_ABSENT;
  }
  return isUsableAddress(game.hash) ? ADDRESS_USABLE : ADDRESS_REVIEW;
};

const describeHashValue = (hash) => {
  if (hash === null) {
    return 'null';
  }
  if (hash === '') {
    return 'empty string';
  }
  return `${typeof hash} ${JSON.stringify(hash) ?? String(hash)}`;
};

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
  const missing = [];
  const review = [];
  for (const game of games) {
    const id = '' + game._id;
    const kind = classifyAddress(game);
    if (kind === ADDRESS_USABLE) {
      claim(game.hash, id);
    } else {
      // Игра на разбор тоже претендует на свой хвост _id: обе его не получат.
      claim(legacyAddressFromId(game._id), id);
      if (kind === ADDRESS_ABSENT) {
        missing.push(game);
      } else {
        review.push({ _id: id, value: describeHashValue(game.hash) });
      }
    }
    for (const code of game.codes || []) {
      claim(code.hash, id);
    }
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
  return { missing: missing.length, assign, skipped, review };
};

const describeSkipped = (skipped) =>
  skipped.map(
    ({ _id, hash, takenBy }) =>
      `skip ${_id}: address ${hash} is taken by ${takenBy.join(', ')}`
  );

const describeReview = (review) =>
  review.map(({ _id, value }) => `review ${_id}: hash is ${value}`);

const createAddressCommands = ({ Game: model, clearGamesCache: clearCache }) => {
  const loadGames = () =>
    model.find().select({ hash: 1, 'codes.hash': 1 }).lean();

  const check = async () => {
    const games = await loadGames();
    const { missing, assign, skipped, review } = planAddresses(games);
    return [
      true,
      [
        `${games.length} games, ${games.length - missing - review.length} with an address`,
        `${missing} games without the field: ${assign.length} to assign, ${skipped.length} to skip`,
        `${review.length} games with an unusable value (need review)`,
        ...describeSkipped(skipped),
        ...describeReview(review),
      ],
    ];
  };

  const run = async () => {
    const games = await loadGames();
    const { assign, skipped, review } = planAddresses(games);
    let assigned = 0;
    const unmatched = [];
    const failed = [];
    for (const { _id, hash } of assign) {
      try {
        // Миграция — не правка игры: updatedAt (порядок в лобби) не трогаем.
        const result = await model.updateOne(
          { _id, hash: { $exists: false } },
          { $set: { hash } },
          { timestamps: false }
        );
        if (result.matchedCount === 0) {
          unmatched.push(
            `not written ${_id}: the field appeared or the game is gone since the plan`
          );
        } else if (result.modifiedCount === 0) {
          unmatched.push(`not written ${_id}: matched but not modified`);
        } else {
          assigned += 1;
        }
      } catch (err) {
        failed.push(`failed ${_id}: ${err.message}`);
      }
    }
    clearCache();
    const after = planAddresses(await loadGames());
    const success =
      failed.length === 0 && unmatched.length === 0 && assigned === assign.length;
    return [
      success,
      [
        `${assigned} of ${assign.length} planned games got an address`,
        `${skipped.length} games skipped`,
        `${review.length} games need review`,
        `after the run: ${after.missing} games without the field, ${after.review.length} need review`,
        ...describeSkipped(skipped),
        ...describeReview(review),
        ...unmatched,
        ...failed,
      ],
    ];
  };

  return { check, run };
};

const { check, run } = createAddressCommands({ Game, clearGamesCache });

module.exports = {
  legacyAddressFromId,
  classifyAddress,
  planAddresses,
  createAddressCommands,
  check,
  run,
};
