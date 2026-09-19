const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Game = require('../../modules/game/models/Game');
const {
  CODE_HASH_LENGTH_FILTER,
  CODE_HASH_LENGTH_UNSET,
  CODE_HASH_LENGTH_UPDATE_OPTIONS,
} = require('../../modules/admin/services/scripts/Game');

// codeHashLength не описан в схеме Game — обычный updateMany молча срежет
// $unset до выполнения запроса (это делает mongoose при кастовании, без
// подключения к базе). Проверяем сам запрос, который строит removeCodeHashLength,
// через тот же приватный путь кастования, которым идёт exec(). Запуск: npm test.

const castedUpdate = (options) => {
  const query = Game.updateMany(CODE_HASH_LENGTH_FILTER, CODE_HASH_LENGTH_UNSET, options);
  query._castUpdate(query.getUpdate());
  return query.getUpdate();
};

// Pre-hooks mongoose (timestamps) — тем же путём, что и exec(), без базы.
const runPreHooks = (query) =>
  new Promise((resolve, reject) =>
    query._queryMiddleware.execPre(query.op, query, [], (err) =>
      err ? reject(err) : resolve()
    )
  );

describe('codeHashLength removal', () => {
  it('a plain updateMany silently strips the unset (the trap)', () => {
    assert.deepEqual(castedUpdate(undefined), { $unset: {} });
  });

  it('strict:false — the options removeCodeHashLength actually uses — keeps it', () => {
    assert.deepEqual(CODE_HASH_LENGTH_UPDATE_OPTIONS, {
      strict: false,
      timestamps: false,
    });
    assert.deepEqual(castedUpdate(CODE_HASH_LENGTH_UPDATE_OPTIONS), {
      $unset: { codeHashLength: 1 },
    });
  });

  it('does not touch updatedAt: a service pass is not an edit of the game', async () => {
    const query = Game.updateMany(
      CODE_HASH_LENGTH_FILTER,
      CODE_HASH_LENGTH_UNSET,
      CODE_HASH_LENGTH_UPDATE_OPTIONS
    );
    await runPreHooks(query);
    assert.deepEqual(query.getUpdate(), { $unset: { codeHashLength: 1 } });

    const plain = Game.updateMany(CODE_HASH_LENGTH_FILTER, CODE_HASH_LENGTH_UNSET, {
      strict: false,
    });
    await runPreHooks(plain);
    assert.ok(plain.getUpdate().$set.updatedAt instanceof Date);
  });
});
