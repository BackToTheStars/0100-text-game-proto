const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { attachVideoPreview } = require('../../modules/admin/controllers/Turn');

// Кадр снимается долго (media, ffmpeg), и за это время ход могли удалить,
// сменить ему видео или превью. Картинка пишется условно — по состоянию, с
// которого её сняли; модель подменена объектом, который отвечает на фильтр
// так же, как Mongo: findOneAndUpdate находит документ только при полном
// совпадении _id / videoUrl / videoPreview. Запуск: npm test.

const turnId = '66a3da300b474f60ae07d6d1';
const VIDEO_A = 'http://localhost:3011/videos/a.mp4';
const VIDEO_B = 'http://localhost:3011/videos/b.mp4';
const FRAME = 'http://localhost:3011/images/a-frame-1.jpg';

// stored — документ в базе на момент записи (null — ход удалён).
const fakeModel = (stored) => {
  const calls = [];
  return {
    calls,
    findOneAndUpdate: async (filter, update, options) => {
      calls.push({ filter, update, options });
      if (!stored) {
        return null;
      }
      const same =
        '' + filter._id === '' + stored._id &&
        filter.videoUrl === stored.videoUrl &&
        filter.videoPreview === (stored.videoPreview ?? null);
      if (!same) {
        return null;
      }
      return { ...stored, videoPreview: update.$set.videoPreview };
    },
    exists: async ({ _id }) => (stored && '' + _id === '' + stored._id ? { _id } : null),
  };
};

describe('attachVideoPreview', () => {
  it('writes the frame when the turn is as it was read, conditionally on video and preview', async () => {
    const read = { _id: turnId, videoUrl: VIDEO_A };
    const model = fakeModel({ _id: turnId, videoUrl: VIDEO_A });
    const updated = await attachVideoPreview(read, FRAME, model);
    assert.equal(updated.videoPreview, FRAME);
    assert.deepEqual(model.calls, [
      {
        filter: { _id: turnId, videoUrl: VIDEO_A, videoPreview: null },
        update: { $set: { videoPreview: FRAME } },
        options: { new: true },
      },
    ]);
  });

  it('replaces a previous preview when it is still the one that was read', async () => {
    const read = { _id: turnId, videoUrl: VIDEO_A, videoPreview: 'old.jpg' };
    const model = fakeModel({ _id: turnId, videoUrl: VIDEO_A, videoPreview: 'old.jpg' });
    const updated = await attachVideoPreview(read, FRAME, model);
    assert.equal(updated.videoPreview, FRAME);
  });

  it('refuses with 409 when videoUrl changed while the frame was taken', async () => {
    const read = { _id: turnId, videoUrl: VIDEO_A };
    const model = fakeModel({ _id: turnId, videoUrl: VIDEO_B, videoPreview: 'b.jpg' });
    await assert.rejects(
      () => attachVideoPreview(read, FRAME, model),
      (err) => err.statusCode === 409 && err.errorCode === 'turn-changed'
    );
  });

  it('refuses with 409 when another preview was set meanwhile, and keeps it', async () => {
    const read = { _id: turnId, videoUrl: VIDEO_A };
    const stored = { _id: turnId, videoUrl: VIDEO_A, videoPreview: 'manual.jpg' };
    const model = fakeModel(stored);
    await assert.rejects(
      () => attachVideoPreview(read, FRAME, model),
      (err) => err.statusCode === 409
    );
    assert.equal(stored.videoPreview, 'manual.jpg');
  });

  it('answers 404 when the turn was deleted meanwhile', async () => {
    const read = { _id: turnId, videoUrl: VIDEO_A };
    await assert.rejects(
      () => attachVideoPreview(read, FRAME, fakeModel(null)),
      (err) => err.statusCode === 404 && !err.errorCode
    );
  });
});
