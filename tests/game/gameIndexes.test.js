const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const Game = require('../../modules/game/models/Game');

// Индексы Game без подключения к базе: mongoose.schema.indexes() собирает их
// из объявлений схемы, ничего не запрашивая. Запуск: npm test.

describe('Game.schema.indexes()', () => {
  it('has the game address index (unique, sparse)', () => {
    const indexes = Game.schema.indexes();
    const hashIndex = indexes.find(([fields]) => fields.hash === 1);
    assert.ok(hashIndex, 'expected an index on hash');
    assert.equal(hashIndex[1].unique, true);
    assert.equal(hashIndex[1].sparse, true);
  });

  it('has a non-unique index on codes.hash', () => {
    const indexes = Game.schema.indexes();
    const codeHashIndex = indexes.find(([fields]) => fields['codes.hash'] === 1);
    assert.ok(codeHashIndex, 'expected an index on codes.hash');
    assert.equal(
      codeHashIndex[1].unique,
      undefined,
      'codes.hash must stay non-unique: the same code is allowed on different games'
    );
  });
});
