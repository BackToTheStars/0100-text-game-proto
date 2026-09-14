const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { describeInputError, getError } = require('../../modules/core/services/errors');
const { requireCsvString } = require('../../modules/core/services/queryParams');

// Текст, который общий обработчик server.js отдаёт наружу на неразобранные
// ValidationError/CastError mongoose, и разбор query-параметров вида
// "hashes,codes,ids" (Express 4 даёт массив на повторе параметра). Запуск:
// npm test (node --test).

describe('describeInputError', () => {
  it('lists the failing fields of a ValidationError', () => {
    const err = {
      name: 'ValidationError',
      errors: { contentType: {}, height: {} },
    };
    assert.equal(describeInputError(err), 'Проверьте поля: contentType, height');
  });

  it('names the field of a CastError', () => {
    const err = { name: 'CastError', path: '_id' };
    assert.equal(describeInputError(err), 'Неверное значение поля «_id»');
  });

  it('is null for errors it does not recognise, including ones with an explicit statusCode', () => {
    assert.equal(describeInputError(getError('Игра не найдена', 404)), null);
    assert.equal(describeInputError(new Error('boom')), null);
    assert.equal(describeInputError(null), null);
  });
});

describe('requireCsvString', () => {
  it('returns the value unchanged when it is a string', () => {
    assert.equal(requireCsvString('a,b', 'ids'), 'a,b');
    assert.equal(requireCsvString('', 'codes'), '');
  });

  it('throws a 400 getError when the value is an array (repeated query param)', () => {
    assert.throws(
      () => requireCsvString(['a', 'b'], 'hashes'),
      (err) => err.statusCode === 400 && /hashes/.test(err.message)
    );
  });
});
