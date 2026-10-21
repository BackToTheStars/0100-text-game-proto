const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const cors = require('cors');
const express = require('express');

const {
  parseCorsOrigins,
  isAdminPath,
  createCorsOptionsDelegate,
} = require('../../config/cors');

// Делегат CORS из config/cors.js: список CORS_ORIGINS сужает только /admin*,
// остальной API открыт любому origin, preflight тоже. Запуск: npm test.

const LIST = 'http://localhost:3002, https://brain-dance.net';
const OWN = 'http://localhost:3002';
const FOREIGN = 'http://foreign.example';

const optionsFor = (delegate, path) => {
  let result;
  delegate({ path }, (err, options) => {
    assert.equal(err, null);
    result = options;
  });
  return result;
};

const OPEN_PATHS = [
  '/codes/login',
  '/codes/refresh',
  '/codes/add',
  '/codes/static-token',
  '/game',
  '/turns',
  '/turns/geometry',
  '/lines',
  '/classes',
  '/lobby/games',
  '/lobby/check-game',
  '/administrator',
];

describe('parseCorsOrigins', () => {
  it('splits, trims and drops empty entries; null when nothing is left', () => {
    assert.deepEqual(parseCorsOrigins(LIST), [OWN, 'https://brain-dance.net']);
    assert.equal(parseCorsOrigins(' , '), null);
    assert.equal(parseCorsOrigins(''), null);
    assert.equal(parseCorsOrigins(undefined), null);
  });
});

describe('isAdminPath', () => {
  it('matches /admin and everything under it, in any case', () => {
    for (const path of ['/admin', '/admin/', '/admin/games', '/admin/auth/login', '/ADMIN/Games']) {
      assert.equal(isAdminPath(path), true, path);
    }
    for (const path of ['/administrator', '/lobby/admin', '/', '/codes/login']) {
      assert.equal(isAdminPath(path), false, path);
    }
  });
});

describe('createCorsOptionsDelegate with CORS_ORIGINS set', () => {
  const delegate = createCorsOptionsDelegate(LIST);

  it('restricts /admin* to the list', () => {
    for (const path of ['/admin/games', '/admin/auth/login', '/ADMIN/games']) {
      assert.deepEqual(optionsFor(delegate, path), {
        origin: [OWN, 'https://brain-dance.net'],
      });
    }
  });

  it('leaves the client contract open', () => {
    for (const path of OPEN_PATHS) {
      assert.deepEqual(optionsFor(delegate, path), {}, path);
    }
  });
});

describe('createCorsOptionsDelegate without CORS_ORIGINS', () => {
  it('opens everything, /admin* included', () => {
    for (const raw of [undefined, '', ' , ']) {
      const delegate = createCorsOptionsDelegate(raw);
      for (const path of ['/admin/games', ...OPEN_PATHS]) {
        assert.deepEqual(optionsFor(delegate, path), {}, `${raw} ${path}`);
      }
    }
  });
});

const request = (port, method, path, headers) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
    req.end();
  });

const preflight = (port, path, origin) =>
  request(port, 'OPTIONS', path, {
    Origin: origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,game-token',
  });

const startApp = (raw) =>
  new Promise((resolve) => {
    const app = express();
    app.use(cors(createCorsOptionsDelegate(raw)));
    app.all('*', (req, res) => res.json({ success: true }));
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });

describe('cors() with the delegate over HTTP', () => {
  let listed;
  let open;

  before(async () => {
    listed = await startApp(OWN);
    open = await startApp(undefined);
  });

  after(() => {
    listed.close();
    open.close();
  });

  it('answers a foreign preflight to the client contract with open headers', async () => {
    for (const path of ['/codes/login', '/turns?hash=a3f9c1', '/codes/static-token?hash=a3f9c1']) {
      const res = await preflight(listed.address().port, path, FOREIGN);
      assert.equal(res.statusCode, 204, path);
      assert.equal(res.headers['access-control-allow-origin'], '*', path);
      assert.match(res.headers['access-control-allow-methods'], /POST/, path);
      assert.equal(res.headers['access-control-allow-headers'], 'content-type,game-token', path);
    }
  });

  it('opens the actual request to the client contract too', async () => {
    const res = await request(listed.address().port, 'GET', '/turns/geometry?hash=a3f9c1', {
      Origin: FOREIGN,
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });

  it('gives a foreign origin no Access-Control-Allow-Origin on /admin*', async () => {
    const res = await preflight(listed.address().port, '/admin/games', FOREIGN);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
    const actual = await request(listed.address().port, 'GET', '/admin/games', { Origin: FOREIGN });
    assert.equal(actual.headers['access-control-allow-origin'], undefined);
  });

  it('reflects a listed origin on /admin*', async () => {
    const res = await preflight(listed.address().port, '/admin/games', OWN);
    assert.equal(res.headers['access-control-allow-origin'], OWN);
  });

  it('opens /admin* to anyone when no list is set', async () => {
    const res = await preflight(open.address().port, '/admin/games', FOREIGN);
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });
});
