const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { parseCorsOrigins } = require('../../config/cors');
const { ROLE_GAME_OWNER, ROLE_GAME_PLAYER } = require('../../config/game/user');
const { resolveGameAccess } = require('../game/services/access');
const { createRooms } = require('./services/rooms');
const { createBucket } = require('./services/rateLimit');
const { castBody } = require('./services/cast');
const {
  HELLO_TIMEOUT_MS,
  HEARTBEAT_MS,
  MAX_PAYLOAD,
  TOUR_GRACE_MS,
  CAST_RATE_PER_SEC,
  CAST_BURST,
} = require('./config');

// Сокет присутствия: кто онлайн в игре, экскурсия, трансляция её ведущего
// спутникам и кадры видимой области от спутников ведущему. Живёт в процессе
// API на том же порту по пути /ws.
// Протокол (сообщения, коды закрытия, ошибки) — brain-platform/docs/presence.md;
// здесь — его серверная половина. Состояние — в services/rooms.js, тут только
// сеть и время: апгрейд, рукопожатие, heartbeat, разбор JSON, маршрутизация
// по `t`, ожидание вернувшегося гида и ограничение частоты трансляции.
//
// Авторизация: токен не в URL (он попал бы в access-логи nginx), а первым
// сообщением hello; проверяется той же функцией, что у gameMiddleware.

const WS_PATH = '/ws';

// Коды закрытия. 4xxx — наши, по таблице контракта; 1011/1012 — стандартные.
const CLOSE_BAD_MESSAGE = 4400; // не JSON, сообщение до hello, hello без hash
const CLOSE_TOKEN = 4401; // подпись, чужая игра, старый формат, истёк, нет токена
const CLOSE_GAME = 4404; // игра не найдена
const CLOSE_TIMEOUT = 4408; // hello не пришёл вовремя
const CLOSE_AMBIGUOUS = 4409; // хеш неоднозначен
const CLOSE_FULL = 4413; // в игре уже максимум соединений
const CLOSE_INTERNAL = 1011; // ошибка сервера (например, база недоступна)
const CLOSE_RESTART = 1012; // сервер останавливается

// HTTP-статус отказа resolveGameAccess → код и reason закрытия сокета.
const CLOSE_BY_STATUS = {
  401: [CLOSE_TOKEN, 'token'],
  404: [CLOSE_GAME, 'game'],
  409: [CLOSE_AMBIGUOUS, 'ambiguous'],
};

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const attachPresence = (server) => {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
  const rooms = createRooms();
  // sid → соединение; rooms про сокеты не знает.
  const sockets = new Map();
  // Тот же список, что у HTTP CORS. Браузер CORS на сокеты не применяет,
  // поэтому чужой Origin отсекается здесь, до рукопожатия.
  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

  const send = (ws, message) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const sendError = (ws, code, message) => {
    send(ws, { t: 'error', code, message });
  };

  const close = (ws, code, reason) => {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close(code, reason);
    }
  };

  // Полный снимок всем в игре — после любого изменения состава или ролей.
  // Опустевшая игра переживается молча: снимок пуст, слать некому.
  const broadcastMembers = (gameId) => {
    const members = rooms.snapshot(gameId);
    const frame = JSON.stringify({ t: 'members', members });
    for (const member of members) {
      const client = sockets.get(member.sid);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(frame);
      }
    }
  };

  // Экскурсии, ждущие вернувшегося гида: "gameId:tourId" → таймер. Время живёт
  // здесь, а не в rooms.js, чтобы состояние проверялось тестами без ожиданий.
  const graceTimers = new Map();

  const clearGrace = (gameId, tourId) => {
    const key = `${gameId}:${tourId}`;
    const timer = graceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      graceTimers.delete(key);
    }
  };

  const startGrace = (gameId, tourId) => {
    clearGrace(gameId, tourId);
    console.log(`presence: tour ${tourId} grace gameId=${gameId}`);
    graceTimers.set(
      `${gameId}:${tourId}`,
      setTimeout(() => {
        graceTimers.delete(`${gameId}:${tourId}`);
        if (rooms.expireTour(gameId, tourId)) {
          console.log(`presence: tour ${tourId} expired gameId=${gameId}`);
          broadcastMembers(gameId);
        }
      }, TOUR_GRACE_MS)
    );
  };

  server.on('upgrade', (req, socket, head) => {
    let pathname = null;
    try {
      pathname = new URL(req.url, 'http://x').pathname;
    } catch (err) {
      pathname = null;
    }
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    if (allowedOrigins && !allowedOrigins.includes(req.headers.origin)) {
      console.log(
        `presence: upgrade refused, origin=${req.headers.origin || '-'}`
      );
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n', () =>
        socket.destroy()
      );
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    let gameId = null;
    let sid = null;
    // hello → auth (ждём проверку токена) → ready (команды принимаются)
    let phase = 'hello';
    // Своё ведро на соединение: поток курсора одного гида не должен съедать
    // квоту остальных.
    const castBucket = createBucket({
      capacity: CAST_BURST,
      refillPerSec: CAST_RATE_PER_SEC,
    });

    const helloTimer = setTimeout(() => {
      close(ws, CLOSE_TIMEOUT, 'timeout');
    }, HELLO_TIMEOUT_MS);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Без обработчика ошибка сокета (например, кадр больше maxPayload) была бы
    // необработанным событием и уронила бы процесс.
    ws.on('error', (err) => {
      console.log(
        `presence: socket error gameId=${gameId || '-'} sid=${sid || '-'}: ${err.message}`
      );
    });

    const hello = async (message) => {
      if (typeof message.hash !== 'string' || !message.hash) {
        close(ws, CLOSE_BAD_MESSAGE, 'bad-message');
        return;
      }
      phase = 'auth';
      let access;
      try {
        access = await resolveGameAccess({
          hash: message.hash,
          token: message.token,
          requireToken: true,
        });
      } catch (err) {
        const [code, reason] = CLOSE_BY_STATUS[err.statusCode] || [
          CLOSE_INTERNAL,
          'internal',
        ];
        if (code === CLOSE_INTERNAL) {
          console.log(`presence: hello failed: ${err.message}`);
        }
        close(ws, code, reason);
        return;
      }
      if (ws.readyState !== WebSocket.OPEN) {
        // Закрылся, пока ждали базу (например, по таймеру hello).
        return;
      }
      clearTimeout(helloTimer);

      const member = {
        sid: crypto.randomUUID(),
        nickname: access.nickname,
        role: access.role,
      };
      try {
        rooms.join(access.gameId, member);
      } catch (err) {
        if (err.code === 'full') {
          close(ws, CLOSE_FULL, 'full');
          return;
        }
        throw err;
      }
      gameId = '' + access.gameId;
      sid = member.sid;
      phase = 'ready';
      sockets.set(sid, ws);
      console.log(
        `presence: open gameId=${gameId} sid=${sid} role=${access.role}`
      );
      send(ws, { t: 'welcome', sid, members: rooms.snapshot(gameId) });
      broadcastMembers(gameId);
    };

    const command = (message) => {
      switch (message.t) {
        case 'lead': {
          if (typeof message.on !== 'boolean') {
            sendError(ws, 'bad-message', '"on" must be true or false');
            return;
          }
          if (!message.on) {
            rooms.setLeader(gameId, sid, false);
            broadcastMembers(gameId);
            return;
          }
          if (message.tour !== undefined && typeof message.tour !== 'string') {
            sendError(ws, 'bad-message', '"tour" must be a string');
            return;
          }
          const me = rooms.get(gameId, sid);
          if (!me) {
            return;
          }
          // Роль — из токена, она приехала с hello. Вести экскурсию может
          // только владелец игры или игрок: посетителю отказ без изменения
          // состояния.
          if (me.role !== ROLE_GAME_OWNER && me.role !== ROLE_GAME_PLAYER) {
            sendError(
              ws,
              'role',
              'Only players and the owner can start a tour'
            );
            return;
          }
          const guide = rooms.setLeader(gameId, sid, true, message.tour);
          if (guide && guide.tour) {
            // Гид вернулся к своей экскурсии — ждать его больше незачем.
            // Для только что начатой экскурсии таймера нет, и снятие холостое.
            if (message.tour && guide.tour === message.tour) {
              console.log(
                `presence: tour ${guide.tour} reclaimed gameId=${gameId} sid=${sid}`
              );
            }
            clearGrace(gameId, guide.tour);
          }
          broadcastMembers(gameId);
          return;
        }
        case 'follow': {
          if (message.tour !== null && typeof message.tour !== 'string') {
            sendError(ws, 'bad-message', '"tour" must be a string or null');
            return;
          }
          try {
            rooms.follow(gameId, sid, message.tour);
          } catch (err) {
            if (!err.code) {
              throw err;
            }
            sendError(ws, err.code, err.message);
            return;
          }
          broadcastMembers(gameId);
          return;
        }
        case 'cast': {
          // Лимит частоты — до всего остального: поток курсора не должен
          // оборачиваться потоком ошибок в обратную сторону.
          if (!castBucket.take()) {
            return;
          }
          const me = rooms.get(gameId, sid);
          if (message.kind === 'viewport-report') {
            // Кадр идёт в обратную сторону: спутник сообщает свою видимую
            // область одному адресату — ведущему своей экскурсии (у того она
            // ложится на миникарту). Ведущий и все, кто ни за кем не следует,
            // получают отказ.
            if (!me || !me.following) {
              sendError(ws, 'not-following', 'Join a tour to report your viewport');
              return;
            }
            const body = castBody(message);
            if (!body) {
              sendError(ws, 'bad-cast', 'Unknown kind or a badly shaped cast body');
              return;
            }
            const guide = rooms.guideOf(gameId, sid);
            if (!guide) {
              // Ведущий оборвался, экскурсия ждёт его возвращения: слать
              // некому, а спутник ни в чём не виноват — кадр отбрасывается
              // молча, без ошибки. Вернувшись, ведущий получит новые кадры.
              return;
            }
            const client = sockets.get(guide.sid);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ t: 'cast', from: sid, ...body }));
            }
            return;
          }
          if (!me || !me.leader) {
            sendError(ws, 'not-leader', 'Start a tour to cast');
            return;
          }
          const body = castBody(message);
          if (!body) {
            sendError(ws, 'bad-cast', 'Unknown kind or a badly shaped cast body');
            return;
          }
          // По текущему состоянию на момент приёма; состав не меняется,
          // поэтому members не рассылается.
          const frame = JSON.stringify({ t: 'cast', from: sid, ...body });
          for (const follower of rooms.followersOf(gameId, sid)) {
            const client = sockets.get(follower.sid);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(frame);
            }
          }
          return;
        }
        default:
          sendError(ws, 'bad-message', 'Unknown message type');
      }
    };

    ws.on('message', (data, isBinary) => {
      let message;
      try {
        if (isBinary) {
          throw new Error('binary frame');
        }
        message = JSON.parse(data.toString());
      } catch (err) {
        close(ws, CLOSE_BAD_MESSAGE, 'bad-message');
        return;
      }

      if (phase !== 'ready') {
        // До welcome принимается ровно одно сообщение — hello.
        if (phase !== 'hello' || !isObject(message) || message.t !== 'hello') {
          close(ws, CLOSE_BAD_MESSAGE, 'bad-message');
          return;
        }
        hello(message).catch((err) => {
          console.log(`presence: hello crashed: ${err.message}`);
          close(ws, CLOSE_INTERNAL, 'internal');
        });
        return;
      }

      if (!isObject(message) || typeof message.t !== 'string') {
        sendError(ws, 'bad-message', 'Message must be an object with a string "t"');
        return;
      }
      try {
        command(message);
      } catch (err) {
        console.log(`presence: command crashed: ${err.message}`);
        close(ws, CLOSE_INTERNAL, 'internal');
      }
    });

    ws.on('close', (code, reason) => {
      clearTimeout(helloTimer);
      if (sid) {
        sockets.delete(sid);
        const left = rooms.leave(gameId, sid);
        if (left) {
          // Игра опустела — ждать в ней некого и некому.
          for (const tourId of left.closed) {
            clearGrace(gameId, tourId);
          }
          if (left.tour) {
            // Ушёл гид: экскурсия и её ведомые ждут его возвращения.
            startGrace(gameId, left.tour);
          }
        }
        broadcastMembers(gameId);
      }
      console.log(
        `presence: close gameId=${gameId || '-'} sid=${sid || '-'} code=${code} reason=${reason.toString() || '-'}`
      );
    });
  });

  // Один таймер на сервер: соединение без pong с прошлого тика рвётся,
  // остальным уходит ping (стандартная схема isAlive из README ws).
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));

  // Штатная остановка HTTP-сервера: клиенты получают 1012 и переподключаются.
  server.on('close', () => {
    for (const timer of graceTimers.values()) {
      clearTimeout(timer);
    }
    graceTimers.clear();
    for (const client of wss.clients) {
      close(client, CLOSE_RESTART, 'restart');
    }
    wss.close();
  });
};

module.exports = {
  attachPresence,
};
