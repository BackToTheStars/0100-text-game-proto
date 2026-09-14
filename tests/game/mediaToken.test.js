const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  buildServicePayload,
  getServiceToken,
  getToken,
  SERVICE_SCOPE,
  SERVICE_TOKEN_TTL,
} = require('../../modules/game/services/game');
const { parseMediaUrl } = require('../../modules/game/services/mediaRelocate');

const SECRET = 'test-static-secret';

describe('buildServicePayload', () => {
  it('always carries the service scope and a timestamp deadline', () => {
    assert.deepEqual(buildServicePayload('stats', undefined, 1000), {
      operation: 'stats',
      timestamp: 1000 + SERVICE_TOKEN_TTL,
      scope: SERVICE_SCOPE,
    });
  });

  it('carries the game address and id when the file belongs to a game', () => {
    const payload = buildServicePayload('frame_save', { hash: 'abc123', gameId: { toString: () => '66a3' } }, 0);
    assert.equal(payload.hash, 'abc123');
    assert.equal(payload.gameId, '66a3');
  });

  it('drops a missing address instead of writing a placeholder', () => {
    for (const hash of [null, undefined, '', 42]) {
      const payload = buildServicePayload('download_and_save', { hash, gameId: '66a3' }, 0);
      assert.equal('hash' in payload, false);
      assert.equal(payload.gameId, '66a3');
    }
    assert.equal('gameId' in buildServicePayload('list', { hash: 'abc123' }, 0), false);
  });
});

describe('getServiceToken / getToken', () => {
  before(() => {
    process.env.JWT_SECRET_STATIC = SECRET;
  });

  it('signs service tokens with the scope', () => {
    const payload = jwt.verify(getServiceToken('limits'), SECRET);
    assert.equal(payload.scope, SERVICE_SCOPE);
    assert.equal(payload.operation, 'limits');
    assert.ok(payload.timestamp > Date.now());
  });

  it('leaves the player upload token without the scope', () => {
    const token = getToken(SECRET, 'upload', Date.now() + 1000, 'abc123', '66a3');
    const payload = jwt.verify(token, SECRET);
    assert.equal('scope' in payload, false);
    assert.equal(payload.hash, 'abc123');
  });
});

describe('parseMediaUrl', () => {
  const HOST = 'localhost:3011';

  it('returns type and file name for a file of the own media', () => {
    assert.deepEqual(parseMediaUrl('http://localhost:3011/videos/4ea5.webm', HOST), {
      type: 'videos',
      filename: '4ea5.webm',
    });
    assert.deepEqual(parseMediaUrl('http://localhost:3011/images/a%20b.JPG?x=1#y', HOST), {
      type: 'images',
      filename: 'a b.JPG',
    });
  });

  it('rejects other hosts, YouTube and non-http urls', () => {
    assert.equal(parseMediaUrl('https://test-media.braindance.space/videos/4ea5.mp4', HOST), null);
    assert.equal(parseMediaUrl('https://www.youtube.com/watch?v=abcdefgh', HOST), null);
    assert.equal(parseMediaUrl('ftp://localhost:3011/videos/4ea5.mp4', HOST), null);
    assert.equal(parseMediaUrl('/videos/4ea5.mp4', HOST), null);
    assert.equal(parseMediaUrl('', HOST), null);
    assert.equal(parseMediaUrl(undefined, HOST), null);
  });

  it('rejects paths that are not /<type>/<name>', () => {
    for (const path of [
      '/videos/',
      '/videos',
      '/videos/a/b.mp4',
      '/files/a.mp4',
      '/constructor/a.mp4',
      '/videos/%2e%2e',
      '/videos/a%2Fb.mp4',
      '/videos/%E0%A4%A',
    ]) {
      assert.equal(parseMediaUrl(`http://localhost:3011${path}`, HOST), null, path);
    }
  });
});
