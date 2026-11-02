const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const { relocateUrl } = require('../../modules/game/services/mediaRelocate');
const { SERVICE_SCOPE } = require('../../modules/game/services/game');

const SECRET = 'test-static-secret';
const MEDIA_URL = process.env.STATIC_MEDIA_URL || 'http://localhost:3011';
const FOREIGN_URL = 'https://files.example.org/pics/cat.jpg';

describe('relocateUrl: download-and-save call to media', () => {
  let sent;
  let previousAdapter;

  before(() => {
    process.env.JWT_SECRET_STATIC = SECRET;
  });

  beforeEach(() => {
    sent = null;
    previousAdapter = axios.defaults.adapter;
    axios.defaults.adapter = async (config) => {
      sent = config;
      return { data: { src: MEDIA_URL + '/images/new.jpg' }, status: 200, statusText: 'OK', headers: {}, config };
    };
  });

  afterEach(() => {
    axios.defaults.adapter = previousAdapter;
  });

  it('posts the source link to the media service with a service token and returns the new src', async () => {
    const result = await relocateUrl(FOREIGN_URL, 'images', 'abc123', '66a3');

    assert.deepEqual(result, { status: 'moved', url: MEDIA_URL + '/images/new.jpg' });
    assert.equal(sent.method, 'post');
    assert.equal(sent.url, MEDIA_URL + '/images/download-and-save');
    assert.deepEqual(JSON.parse(sent.data), { mediaUrl: FOREIGN_URL });
    assert.ok(sent.timeout >= 60 * 1000);

    const bearer = sent.headers.Authorization;
    assert.match(bearer, /^Bearer /);
    const payload = jwt.verify(bearer.slice('Bearer '.length), SECRET);
    assert.equal(payload.operation, 'download_and_save');
    assert.equal(payload.scope, SERVICE_SCOPE);
    assert.equal(payload.hash, 'abc123');
    assert.equal(payload.gameId, '66a3');
  });

  it('reports an error when media answers without src', async () => {
    axios.defaults.adapter = async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    const result = await relocateUrl(FOREIGN_URL, 'images', 'abc123', '66a3');
    assert.deepEqual(result, { status: 'error', error: 'empty src from media' });
  });

  it('does not call media for a link already on the current media host', async () => {
    const result = await relocateUrl(MEDIA_URL + '/images/own.jpg', 'images', 'abc123', '66a3');
    assert.equal(result.status, 'local');
    assert.equal(sent, null);
  });
});
