#!/usr/bin/env node
// Живой сценарий сокета присутствия против запущенного сервера:
// своя игра → два соединения (владелец и посетитель) → экскурсия и её гид,
// подписка, трансляция центра вьюпорта и курсора, штрих карандаша (пять
// операций и их отказы), видимая область спутника ведущему и сигнал
// «поле сохранено» спутникам (и их отказы), лимит частоты, отказы, обрыв гида
// (кадр спутника в это время пропадает молча) и возвращение к своей экскурсии
// (кадр доходит под новым sid), конец экскурсии, уход → удаление игры своим же
// токеном. Печатает PASS/FAIL по шагам; код возврата 1 при любом провале.
//
// Истечение ожидания вернувшегося гида (минута) здесь не проверяется — на него
// есть тест состояния в tests/presence/rooms.test.js.
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
      // Забрать из очереди всё подходящее разом — для проверок «сколько
      // кадров дошло», где ждать нечего, всё уже прилетело.
      drain: (match) => {
        const taken = queue.filter(match);
        for (const message of taken) {
          queue.splice(queue.indexOf(message), 1);
        }
        return taken;
      },
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

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

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
    assert(
      me.leader === false && me.tour === null && me.following === null,
      'a fresh member must neither guide a tour nor follow one'
    );
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

  await step('owner: lead on → both get members with an 8-hex tour on the owner', async () => {
    ctx.owner.send({ t: 'lead', on: true });
    const guides = (list) => list.some((m) => m.sid === ctx.ownerSid && m.leader === true);
    const { members } = await ctx.owner.expect(membersWhere(guides), 'members with a guide');
    const me = members.find((m) => m.sid === ctx.ownerSid);
    assert(/^[0-9a-f]{8}$/.test(me.tour), `tour "${me.tour}" is not 8 hex characters`);
    ctx.tour = me.tour;
    const { members: seen } = await ctx.visitor.expect(
      membersWhere(guides),
      'members with a guide'
    );
    const guide = seen.find((m) => m.sid === ctx.ownerSid);
    const visitor = seen.find((m) => m.sid === ctx.visitorSid);
    assert(guide.tour === ctx.tour, 'the visitor sees another tour id');
    assert(visitor.following === null, 'the visitor follows the tour without asking');
  });

  await step('visitor (not a player): lead on → error "role"', async () => {
    ctx.visitor.send({ t: 'lead', on: true });
    const error = await ctx.visitor.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'role', `expected code "role", got "${error.code}"`);
  });

  await step('visitor: follow the tour → both see following = tour', async () => {
    ctx.visitor.send({ t: 'follow', tour: ctx.tour });
    const follows = (list) =>
      list.some((m) => m.sid === ctx.visitorSid && m.following === ctx.tour);
    await ctx.owner.expect(membersWhere(follows), 'members with following');
    await ctx.visitor.expect(membersWhere(follows), 'members with following');
  });

  await step('visitor: follow a made-up tour → error "no-leader"', async () => {
    ctx.visitor.send({ t: 'follow', tour: 'deadbeef' });
    const error = await ctx.visitor.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'no-leader', `expected code "no-leader", got "${error.code}"`);
  });

  await step('owner (guide): follow their own tour → error "leader"', async () => {
    ctx.owner.send({ t: 'follow', tour: ctx.tour });
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
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'viewport',
      'cast viewport'
    );
    assert(cast.from === ctx.ownerSid, 'cast.from is not the owner sid');
    assert(cast.x === 100 && cast.y === 200, 'cast body differs');
  });

  await step('owner: cast cursor {10, 20} → visitor gets cast cursor with from', async () => {
    ctx.owner.send({ t: 'cast', kind: 'cursor', x: 10, y: 20 });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'cursor',
      'cast cursor'
    );
    assert(cast.from === ctx.ownerSid, 'cast.from is not the owner sid');
    assert(cast.x === 10 && cast.y === 20, 'cursor coordinates differ');
    assert(cast.off === undefined, 'a moving cursor must not carry off');
  });

  await step('owner: cast cursor off → visitor gets off: true', async () => {
    ctx.owner.send({ t: 'cast', kind: 'cursor', off: true });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'cursor' && m.off === true,
      'cast cursor off'
    );
    assert(cast.from === ctx.ownerSid, 'cast.from is not the owner sid');
    assert(cast.x === undefined && cast.y === undefined, 'off must carry no coordinates');
  });

  await step('owner: cast cursor with a non-numeric x → error "bad-cast"', async () => {
    ctx.owner.send({ t: 'cast', kind: 'cursor', x: 'a', y: 2 });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-cast', `expected code "bad-cast", got "${error.code}"`);
  });

  await step('owner: cast with bad body → error "bad-cast"', async () => {
    ctx.owner.send({ t: 'cast', kind: 'viewport', x: 'a', y: 2 });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-cast', `expected code "bad-cast", got "${error.code}"`);
  });

  await step('owner: cast draw start → visitor gets it with from', async () => {
    ctx.strokeId = 'a1b2c3d4';
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'start', id: ctx.strokeId, x: 5, y: 6 });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'draw' && m.op === 'start',
      'cast draw start'
    );
    assert(cast.from === ctx.ownerSid, 'cast.from is not the owner sid');
    assert(cast.id === ctx.strokeId && cast.x === 5 && cast.y === 6, 'draw start body differs');
  });

  await step('owner: cast draw move with 150 points → visitor gets exactly that many numbers', async () => {
    const points = Array.from({ length: 300 }, (_, i) => i);
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'move', id: ctx.strokeId, points });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'draw' && m.op === 'move',
      'cast draw move'
    );
    assert(cast.id === ctx.strokeId, 'draw move id differs');
    assert(cast.points.length === 300, `expected 300 numbers, got ${cast.points.length}`);
  });

  await step('owner: cast draw move with 151 points → error "bad-cast"', async () => {
    const points = Array.from({ length: 302 }, (_, i) => i);
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'move', id: ctx.strokeId, points });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-cast', `expected code "bad-cast", got "${error.code}"`);
  });

  await step('owner: cast draw move with an odd-length points array → error "bad-cast"', async () => {
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'move', id: ctx.strokeId, points: [1, 2, 3] });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-cast', `expected code "bad-cast", got "${error.code}"`);
  });

  await step('owner: cast draw end → visitor gets it', async () => {
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'end', id: ctx.strokeId });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'draw' && m.op === 'end',
      'cast draw end'
    );
    assert(cast.id === ctx.strokeId, 'draw end id differs');
  });

  await step('owner: cast draw remove → visitor gets it', async () => {
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'remove', id: ctx.strokeId });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'draw' && m.op === 'remove',
      'cast draw remove'
    );
    assert(cast.id === ctx.strokeId, 'draw remove id differs');
  });

  await step('owner: cast draw clear → visitor gets it with no id', async () => {
    ctx.owner.send({ t: 'cast', kind: 'draw', op: 'clear' });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'draw' && m.op === 'clear',
      'cast draw clear'
    );
    assert(cast.id === undefined, 'draw clear must carry no id');
  });

  await step('visitor (not a guide): cast draw start → error "not-leader"', async () => {
    ctx.visitor.send({ t: 'cast', kind: 'draw', op: 'start', id: 'ffffffff', x: 1, y: 1 });
    const error = await ctx.visitor.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'not-leader', `expected code "not-leader", got "${error.code}"`);
  });

  await step('visitor (follower): cast viewport-report → owner gets it with from and four numbers', async () => {
    ctx.visitor.send({
      t: 'cast',
      kind: 'viewport-report',
      x: -120,
      y: 48,
      width: 1280,
      height: 720,
      stray: 'dropped',
    });
    const cast = await ctx.owner.expect(
      (m) => m.t === 'cast' && m.kind === 'viewport-report',
      'cast viewport-report'
    );
    assert(cast.from === ctx.visitorSid, 'cast.from is not the visitor sid');
    assert(
      cast.x === -120 && cast.y === 48 && cast.width === 1280 && cast.height === 720,
      'viewport-report body differs'
    );
    assert(
      Object.keys(cast).sort().join() === 'from,height,kind,t,width,x,y',
      `unexpected fields: ${Object.keys(cast).join()}`
    );
  });

  await step('owner (guide, follows nobody): cast viewport-report → error "not-following"', async () => {
    ctx.owner.send({ t: 'cast', kind: 'viewport-report', x: 0, y: 0, width: 800, height: 600 });
    const error = await ctx.owner.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'not-following', `expected code "not-following", got "${error.code}"`);
    assert(ctx.owner.ws.readyState === WebSocket.OPEN, 'socket closed');
  });

  await step('visitor: cast viewport-report with width: 0 → error "bad-cast"', async () => {
    ctx.visitor.send({ t: 'cast', kind: 'viewport-report', x: 0, y: 0, width: 0, height: 600 });
    const error = await ctx.visitor.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'bad-cast', `expected code "bad-cast", got "${error.code}"`);
    assert(ctx.visitor.ws.readyState === WebSocket.OPEN, 'socket closed');
  });

  await step('owner: cast saved with a stray field → visitor gets cast saved with from and nothing else', async () => {
    ctx.owner.send({ t: 'cast', kind: 'saved', x: 1, points: [1, 2] });
    const cast = await ctx.visitor.expect(
      (m) => m.t === 'cast' && m.kind === 'saved',
      'cast saved'
    );
    assert(cast.from === ctx.ownerSid, 'cast.from is not the owner sid');
    assert(
      Object.keys(cast).sort().join() === 'from,kind,t',
      `saved must carry no other fields, got: ${Object.keys(cast).join()}`
    );
  });

  await step('visitor (not a guide): cast saved → error "not-leader"', async () => {
    ctx.visitor.send({ t: 'cast', kind: 'saved' });
    const error = await ctx.visitor.expect((m) => m.t === 'error', 'error');
    assert(error.code === 'not-leader', `expected code "not-leader", got "${error.code}"`);
  });

  await step('owner: 100 cast cursor in a row → no more than 45 reach the visitor', async () => {
    // Ведро наполняется секундой тишины, чтобы счёт был про лимит, а не про
    // остаток от предыдущих шагов.
    await sleep(1100);
    ctx.owner.drain((m) => m.t === 'error');
    ctx.visitor.drain((m) => m.t === 'cast');
    for (let i = 0; i < 100; i++) {
      ctx.owner.send({ t: 'cast', kind: 'cursor', x: i, y: i });
    }
    await sleep(500);
    const got = ctx.visitor.drain((m) => m.t === 'cast').length;
    const errors = ctx.owner.drain((m) => m.t === 'error');
    assert(got > 0, 'not a single cast reached the visitor');
    assert(got <= 45, `expected at most 45 casts, got ${got}`);
    assert(errors.length === 0, `the dropped frames answered with ${errors.length} error(s)`);
    assert(ctx.owner.ws.readyState === WebSocket.OPEN, 'the socket was closed over the limit');
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

  await step('owner closes the socket → the visitor keeps following the tour', async () => {
    ctx.owner.ws.close(1000, 'bye');
    const { members } = await ctx.visitor.expect(
      membersWhere((list) => list.length === 1),
      'members ×1',
      1000
    );
    assert(members[0].sid === ctx.visitorSid, 'the remaining member is not the visitor');
    assert(
      members[0].following === ctx.tour,
      `following changed to "${members[0].following}" while the guide was away`
    );
  });

  await step('visitor: cast viewport-report while the guide is away → silence within 500 ms, no error', async () => {
    ctx.visitor.drain((m) => m.t === 'error' || m.t === 'cast');
    ctx.visitor.send({ t: 'cast', kind: 'viewport-report', x: 10, y: 20, width: 800, height: 600 });
    await sleep(500);
    const errors = ctx.visitor.drain((m) => m.t === 'error');
    const casts = ctx.visitor.drain((m) => m.t === 'cast');
    assert(errors.length === 0, `expected silence, got error "${errors[0] && errors[0].code}"`);
    assert(casts.length === 0, `expected silence, got ${casts.length} cast(s)`);
    assert(ctx.visitor.ws.readyState === WebSocket.OPEN, 'socket closed');
  });

  await step('owner reconnects with lead { tour } → the same tour with a new sid', async () => {
    ctx.owner = await openSocket('owner-again');
    ctx.owner.send({ t: 'hello', hash: ctx.hash, token: ctx.ownerToken });
    const welcome = await ctx.owner.expect((m) => m.t === 'welcome', 'welcome');
    assert(welcome.sid !== ctx.ownerSid, 'the new connection reused the old sid');
    ctx.ownerSid = welcome.sid;

    ctx.owner.send({ t: 'lead', on: true, tour: ctx.tour });
    const reclaimed = (list) =>
      list.some((m) => m.sid === ctx.ownerSid && m.leader === true && m.tour === ctx.tour);
    await ctx.owner.expect(membersWhere(reclaimed), 'members with the tour back');
    const { members } = await ctx.visitor.expect(
      membersWhere(reclaimed),
      'members with the tour back'
    );
    const visitor = members.find((m) => m.sid === ctx.visitorSid);
    assert(visitor.following === ctx.tour, 'the visitor lost the tour while the guide was away');
  });

  await step('visitor: cast viewport-report → the returned guide gets it under the new sid', async () => {
    ctx.visitor.send({ t: 'cast', kind: 'viewport-report', x: 30, y: 40, width: 800, height: 600 });
    const cast = await ctx.owner.expect(
      (m) => m.t === 'cast' && m.kind === 'viewport-report',
      'cast viewport-report'
    );
    assert(cast.from === ctx.visitorSid, 'cast.from is not the visitor sid');
    assert(cast.x === 30 && cast.y === 40, 'viewport-report body differs');
  });

  await step('owner: lead off → the visitor stops following, the tour is gone', async () => {
    ctx.owner.send({ t: 'lead', on: false });
    const ended = (list) =>
      list.some((m) => m.sid === ctx.ownerSid && m.leader === false && m.tour === null) &&
      list.some((m) => m.sid === ctx.visitorSid && m.following === null);
    await ctx.owner.expect(membersWhere(ended), 'members without the tour');
    await ctx.visitor.expect(membersWhere(ended), 'members without the tour');
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
