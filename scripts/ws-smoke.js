#!/usr/bin/env node
// Живой сценарий сокета присутствия против запущенного сервера:
// своя игра → два соединения (владелец и посетитель) → ведущий, подписка,
// трансляция центра вьюпорта, отказы, уход → удаление игры своим же токеном.
// Печатает PASS/FAIL по шагам; код возврата 1 при любом провале.
//
//   node scripts/ws-smoke.js                       # http://localhost:3000
//   API_URL=https://server.brain-dance.net node scripts/ws-smoke.js
//
// Origin не шлётся: при заданном CORS_ORIGINS сервер отверг бы апгрейд ещё до
// рукопожатия — для проверки такого стенда передайте WS_ORIGIN=<origin из списка>.

const WebSocket = require('ws');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';
const WS_ORIGIN = process.env.WS_ORIGIN;
const WAIT_MS = 3000;

const api = async (method, path, { token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['game-token'] = token;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${data.message || ''}`);
  }
  return data;
};

// Соединение с очередью входящих сообщений: expect() отдаёт первое сообщение,
// подходящее под предикат, — из уже полученных или из будущих, с таймаутом.
const openSocket = (name) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, WS_ORIGIN ? { origin: WS_ORIGIN } : {});
    const queue = [];
    const waiters = [];
    const closed = new Promise((done) => {
      ws.on('close', (code, reason) => done({ code, reason: reason.toString() }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const index = waiters.findIndex((waiter) => waiter.match(message));
      if (index === -1) {
        queue.push(message);
        return;
      }
      const [waiter] = waiters.splice(index, 1);
      waiter.resolve(message);
    });

    const client = {
      name,
      ws,
      closed,
      send: (message) => ws.send(JSON.stringify(message)),
      expect: (match, label, timeout = WAIT_MS) =>
        new Promise((done, fail) => {
          const index = queue.findIndex(match);
          if (index !== -1) {
            done(queue.splice(index, 1)[0]);
            return;
          }
          const waiter = { match, resolve: done };
          waiters.push(waiter);
          setTimeout(() => {
            const at = waiters.indexOf(waiter);
            if (at !== -1) {
              waiters.splice(at, 1);
              fail(new Error(`${name}: no "${label}" within ${timeout} ms`));
            }
          }, timeout);
        }),
    };

    ws.once('open', () => resolve(client));
    ws.once('error', (err) => reject(new Error(`${name}: ${err.message}`)));
  });

const assert = (condition, text) => {
  if (!condition) {
    throw new Error(text);
  }
};

const membersWhere = (predicate) => (message) =>
  message.t === 'members' && predicate(message.members);

const main = async () => {
  const results = [];
  let failed = false;
  const step = async (label, fn) => {
    if (failed) {
      results.push(['SKIP', label]);
      console.log(`SKIP  ${label}`);
      return;
    }
    try {
      await fn();
      results.push(['PASS', label]);
      console.log(`PASS  ${label}`);
    } catch (err) {
      failed = true;
      results.push(['FAIL', label]);
      console.log(`FAIL  ${label}\n      ${err.message}`);
    }
  };

  const ctx = {};

  console.log(`API ${API_URL}, socket ${WS_URL}`);

  await step('POST /game creates a throwaway game', async () => {
    const { item } = await api('POST', '/game', {
      body: { name: `ws-smoke ${new Date().toISOString()}`, public: false },
    });
    assert(item && item.hash && item.code && item.code.hash, 'no hash/code in the answer');
    ctx.hash = item.hash;
    ctx.ownerCode = item.code.hash;
  });

  await step('POST /codes/login as owner', async () => {
    const { token } = await api('POST', '/codes/login', {
      body: { code: ctx.ownerCode, nickname: 'smoke-owner' },
    });
    assert(token, 'no token');
    ctx.ownerToken = token;
  });

  await step('POST /codes/add issues a visitor code', async () => {
    const { item } = await api('POST', `/codes/add?hash=${ctx.hash}`, {
      token: ctx.ownerToken,
      body: { role: 1 },
    });
    assert(item && item.hash, 'no code');
    ctx.visitorCode = item.hash;
  });

  await step('POST /codes/login as visitor', async () => {
    const { token } = await api('POST', '/codes/login', {
      body: { code: ctx.visitorCode, nickname: 'smoke-visitor' },
    });
    assert(token, 'no token');
    ctx.visitorToken = token;
  });

  await step('owner: hello → welcome with one member', async () => {
    ctx.owner = await openSocket('owner');
    ctx.owner.send({ t: 'hello', hash: ctx.hash, token: ctx.ownerToken });
    const welcome = await ctx.owner.expect((m) => m.t === 'welcome', 'welcome');
    assert(typeof welcome.sid === 'string' && welcome.sid, 'welcome without sid');
    assert(welcome.members.length === 1, `expected 1 member, got ${welcome.members.length}`);
    const [me] = welcome.members;
    assert(me.sid === welcome.sid, 'my sid is not in members');
    assert(me.nickname === 'smoke-owner' && me.role === 3, 'nickname/role are not from the token');
    assert(me.leader === false && me.following === null, 'fresh member must not lead or follow');
    ctx.ownerSid = welcome.sid;
  });

  await step('visitor: hello → welcome with two members; owner gets members with two', async () => {
    ctx.visitor = await openSocket('visitor');
    ctx.visitor.send({ t: 'hello', hash: ctx.hash, token: ctx.visitorToken });
    const welcome = await ctx.visitor.expect((m) => m.t === 'welcome', 'welcome');
    assert(welcome.members.length === 2, `expected 2 members, got ${welcome.members.length}`);
    ctx.visitorSid = welcome.sid;
    const visitor = welcome.members.find((m) => m.sid === ctx.visitorSid);
    assert(visitor && visitor.role === 1 && visitor.nickname === 'smoke-visitor', 'visitor row is wrong');
    await ctx.owner.expect(membersWhere((list) => list.length === 2), 'members ×2');
  });

  await step('owner: lead on → both get members with the owner as leader', async () => {
    ctx.owner.send({ t: 'lead', on: true });
    const isLeader = (list) => list.some((m) => m.sid === ctx.ownerSid && m.leader === true);
    await ctx.owner.expect(membersWhere(isLeader), 'members with leader');
    await ctx.visitor.expect(membersWhere(isLeader), 'members with leader');
  });

  await step('visitor: follow owner → both see following = owner sid', async () => {
    ctx.visitor.send({ t: 'follow', sid: ctx.ownerSid });
    const follows = (list) =>
      list.some((m) => m.sid === ctx.visitorSid && m.following === ctx.ownerSid);
    await ctx.owner.expect(membersWhere(follows), 'members with following');
    await ctx.visitor.expect(membersWhere(follows), 'members with following');
  });

  await step('owner (leader): follow visitor → error "leader"', async () => {
    ctx.owner.send({ t: 'follow', sid: ctx.visitorSid });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'leader', `expected code "leader", got "${error.code}"`);
  });

  await step('visitor: cast → error "not-leader"', async () => {
    ctx.visitor.send({ t: 'cast', kind: 'viewport', x: 1, y: 2 });
    const error = await ctx.visitor.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'not-leader', `expected code "not-leader", got "${error.code}"`);
  });

  await step('owner: cast viewport {100, 200} → visitor gets cast with from', async () => {
    ctx.owner.send({ t: 'cast', kind: 'viewport', x: 100, y: 200 });
    const cast = await ctx.visitor.expect((m) => m.t === 'cast', 'cast');
    assert(cast.from === ctx.ownerSid, 'cast.from is not the owner sid');
    assert(cast.kind === 'viewport' && cast.x === 100 && cast.y === 200, 'cast body differs');
  });

  await step('owner: cast with bad body → error "bad-cast"', async () => {
    ctx.owner.send({ t: 'cast', kind: 'viewport', x: 'a', y: 2 });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-cast', `expected code "bad-cast", got "${error.code}"`);
  });

  await step('unknown message type → error "bad-message", socket stays open', async () => {
    ctx.owner.send({ t: 'nope' });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-message', `expected code "bad-message", got "${error.code}"`);
    assert(ctx.owner.ws.readyState === WebSocket.OPEN, 'socket closed');
  });

  await step('hello without token → close 4401 "token"', async () => {
    const stranger = await openSocket('stranger');
    stranger.send({ t: 'hello', hash: ctx.hash });
    const { code, reason } = await stranger.closed;
    assert(code === 4401, `expected 4401, got ${code} (${reason})`);
    assert(reason === 'token', `expected reason "token", got "${reason}"`);
  });

  await step('hello with a broken token → close 4401 "token"', async () => {
    const forger = await openSocket('forger');
    forger.send({ t: 'hello', hash: ctx.hash, token: ctx.ownerToken.slice(0, -2) + 'xx' });
    const { code } = await forger.closed;
    assert(code === 4401, `expected 4401, got ${code}`);
  });

  await step('hello with an unknown hash → close 4404 "game"', async () => {
    const lost = await openSocket('lost');
    lost.send({ t: 'hello', hash: 'zzz', token: ctx.ownerToken });
    const { code, reason } = await lost.closed;
    assert(code === 4404 && reason === 'game', `expected 4404 "game", got ${code} "${reason}"`);
  });

  await step('visitor closes → owner gets members with one within 2 s', async () => {
    ctx.visitor.ws.close(1000, 'bye');
    const { members } = await ctx.owner.expect(
      membersWhere((list) => list.length === 1),
      'members ×1',
      2000
    );
    assert(members[0].sid === ctx.ownerSid, 'the remaining member is not the owner');
  });

  await step('owner closes', async () => {
    ctx.owner.ws.close(1000, 'bye');
    const { code } = await ctx.owner.closed;
    assert(code === 1000, `expected 1000, got ${code}`);
  });

  // Уборка — всегда, даже после провала, чтобы не оставлять игр на стенде.
  if (ctx.hash && ctx.ownerToken) {
    const wasFailed = failed;
    failed = false;
    await step('DELETE /game with the owner token', async () => {
      const { success } = await api('DELETE', `/game?hash=${ctx.hash}&withoutSnapshot=1`, {
        token: ctx.ownerToken,
      });
      assert(success === true, 'no success in the answer');
    });
    failed = failed || wasFailed;
  }

  for (const client of [ctx.owner, ctx.visitor]) {
    if (client && client.ws.readyState !== WebSocket.CLOSED) {
      client.ws.terminate();
    }
  }

  const passed = results.filter(([status]) => status === 'PASS').length;
  console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${passed}/${results.length} steps passed`);
  return failed ? 1 : 0;
};

// process.exit сразу после закрытия сокета на Windows иногда роняет libuv
// (assertion в async.c) — даём дескрипторам закрыться, потом выходим.
const exitAfterDrain = (code) => setTimeout(() => process.exit(code), 250);

main().then(exitAfterDrain, (err) => {
  console.error(`FAIL: ${err.stack || err.message}`);
  exitAfterDrain(1);
});
