const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { isDeletedDuringSave } = require('../../modules/admin/controllers/Turn');

// Ход мог быть удалён, пока шла съёмка кадра: turn.save() бросает
// DocumentNotFoundError (mongoose 8), и videoPreview должен ответить 404
// "Ход удалён", а не голым 500. Живое воспроизведение (удалить ход ровно в
// окне между resolveTurn и turn.save во время сетевого вызова к media)
// таймингово ненадёжно — здесь проверяется классификатор ошибки, который
// решает, отвечать 404 или пробросить ошибку дальше. Запуск: npm test.

describe('isDeletedDuringSave', () => {
  it('recognises mongoose DocumentNotFoundError by name', () => {
    assert.equal(isDeletedDuringSave({ name: 'DocumentNotFoundError' }), true);
  });

  it('is false for any other error, including a bare CastError', () => {
    assert.equal(isDeletedDuringSave(new Error('boom')), false);
    assert.equal(isDeletedDuringSave({ name: 'CastError' }), false);
    assert.equal(isDeletedDuringSave(null), false);
    assert.equal(isDeletedDuringSave(undefined), false);
  });
});
