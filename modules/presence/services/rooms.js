const crypto = require('crypto');
const { MAX_MEMBERS_PER_GAME, TOUR_ID_BYTES } = require('../config');

// Состояние присутствия: кто сейчас онлайн в какой игре, кто ведёт экскурсию
// и кто на неё подписан. Только память процесса, никакой сети и ни одного
// таймера: сокеты держит ws.js, он же отсчитывает ожидание вернувшегося гида
// и после каждой операции рассылает всем в игре снимок snapshot(). Так
// состояние проверяется тестами без единого соединения и без ожиданий.
// Сервер запускается в одном экземпляре, поэтому Map в памяти достаточно.
//
// Участник (member): { sid, nickname, role, leader, tour, following }, где
// sid — идентификатор соединения (две вкладки одного человека — два
// участника), role — число из config/game/user.js, tour — id экскурсии,
// которую я веду, following — id экскурсии, за которой я слежу, или null.
//
// Экскурсия хранится в комнате отдельно от участника:
// tours: Map<tourId, { sid, nickname, role }>. Подписка указывает на неё, а не
// на соединение гида, и потому переживает обрыв: при уходе гида запись
// остаётся с sid: null (ждёт возвращения), ведомые всё это время подписаны, а
// вернувшийся гид получает ту же экскурсию с новым sid. Снимает ожидание
// ws.js вызовом expireTour.

const refuse = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const toPublic = (member) => ({
  sid: member.sid,
  nickname: member.nickname,
  role: member.role,
  leader: member.leader,
  tour: member.tour,
  following: member.following,
});

const createRooms = ({ maxMembers = MAX_MEMBERS_PER_GAME } = {}) => {
  // '' + gameId → { members: Map<sid, member>, tours: Map<tourId, tour> };
  // ключ — строка, потому что gameId приходит ObjectId'ом, а Map сравнивает
  // объекты по ссылке.
  const games = new Map();

  const roomOf = (gameId) => games.get('' + gameId);

  const find = (gameId, sid) => {
    const room = roomOf(gameId);
    return (room && room.members.get(sid)) || null;
  };

  // Все, кто следил за этой экскурсией, остаются без неё.
  const dropFollowers = (room, tourId) => {
    for (const member of room.members.values()) {
      if (member.following === tourId) {
        member.following = null;
      }
    }
  };

  const newTourId = (room) => {
    let id = crypto.randomBytes(TOUR_ID_BYTES).toString('hex');
    while (room.tours.has(id)) {
      id = crypto.randomBytes(TOUR_ID_BYTES).toString('hex');
    }
    return id;
  };

  const join = (gameId, { sid, nickname, role }) => {
    let room = roomOf(gameId);
    if (room && room.members.size >= maxMembers) {
      throw refuse('full', `The game already has ${maxMembers} connections`);
    }
    if (!room) {
      room = { members: new Map(), tours: new Map() };
      games.set('' + gameId, room);
    }
    const member = {
      sid,
      nickname,
      role,
      leader: false,
      tour: null,
      following: null,
    };
    room.members.set(sid, member);
    return toPublic(member);
  };

  // Уход участника. Возвращает { tour, closed } или null, если такого участника
  // в игре не было. tour — экскурсия, которая осталась ждать своего гида
  // (ws.js заводит на неё таймер); closed — экскурсии опустевшей комнаты,
  // удалённые вместе с ней (ws.js снимает их таймеры).
  const leave = (gameId, sid) => {
    const room = roomOf(gameId);
    if (!room || !room.members.has(sid)) {
      return null;
    }
    const member = room.members.get(sid);
    room.members.delete(sid);
    if (room.members.size === 0) {
      const closed = [...room.tours.keys()];
      games.delete('' + gameId);
      return { tour: null, closed };
    }
    // Ведомых ушедшего гида не трогаем: экскурсия ждёт его возвращения.
    let tour = null;
    if (member.tour && room.tours.has(member.tour)) {
      room.tours.get(member.tour).sid = null;
      tour = member.tour;
    }
    return { tour, closed: [] };
  };

  const get = (gameId, sid) => {
    const member = find(gameId, sid);
    return member ? toPublic(member) : null;
  };

  // on: true — начать экскурсию. tourId — id прежней экскурсии у вернувшегося
  // после обрыва гида: он получает её обратно вместе с ведомыми, если она ещё
  // ждёт и ник с ролью те же. Иначе (id не назван, неизвестен, истёк, чужой
  // живой или ник другой) начинается новая экскурсия с новым id — клиент
  // узнаёт его из снимка. Проверка роли — в ws.js: состояние про права
  // не знает.
  // on: false — экскурсия закончена: подписки сняты, запись удалена.
  const setLeader = (gameId, sid, on, tourId) => {
    const room = roomOf(gameId);
    const member = find(gameId, sid);
    if (!member) {
      return null;
    }
    if (!on) {
      if (member.leader) {
        dropFollowers(room, member.tour);
        room.tours.delete(member.tour);
        member.tour = null;
        member.leader = false;
      }
      return toPublic(member);
    }
    if (member.leader) {
      // Уже веду: повторное включение ничего не меняет и id не переписывает.
      return toPublic(member);
    }
    const kept = typeof tourId === 'string' ? room.tours.get(tourId) : null;
    if (
      kept &&
      kept.sid === null &&
      kept.nickname === member.nickname &&
      kept.role === member.role
    ) {
      kept.sid = sid;
      member.tour = tourId;
    } else {
      const id = newTourId(room);
      room.tours.set(id, { sid, nickname: member.nickname, role: member.role });
      member.tour = id;
    }
    member.leader = true;
    member.following = null;
    return toPublic(member);
  };

  // tourId = null — отписка; она разрешена всем, в том числе гиду, которому
  // и так следовать не за кем. Экскурсия, ждущая своего гида, подписку
  // принимает: ведомый дождётся его возвращения.
  const follow = (gameId, sid, tourId) => {
    const room = roomOf(gameId);
    const member = find(gameId, sid);
    if (!member) {
      return null;
    }
    if (tourId === null) {
      member.following = null;
      return toPublic(member);
    }
    if (member.leader) {
      throw refuse(
        'leader',
        'A guide cannot join a tour: end your own tour first'
      );
    }
    if (!room.tours.has(tourId)) {
      throw refuse('no-leader', 'That tour is over');
    }
    member.following = tourId;
    return toPublic(member);
  };

  // Ожидание вернувшегося гида истекло. true — экскурсия и правда была снята;
  // false — гид уже вернулся (sid снова наш) или записи давно нет, и рассылать
  // снимок незачем.
  const expireTour = (gameId, tourId) => {
    const room = roomOf(gameId);
    if (!room) {
      return false;
    }
    const tour = room.tours.get(tourId);
    if (!tour || tour.sid !== null) {
      return false;
    }
    dropFollowers(room, tourId);
    room.tours.delete(tourId);
    return true;
  };

  const followersOf = (gameId, sid) => {
    const room = roomOf(gameId);
    const member = find(gameId, sid);
    if (!room || !member || !member.tour) {
      return [];
    }
    return [...room.members.values()]
      .filter((other) => other.following === member.tour)
      .map(toPublic);
  };

  // Ведущий экскурсии, за которой следует sid: публичная копия его записи
  // участника — по ней ws.js адресует кадры спутника (видимая область для
  // миникарты). null — sid никому не следует, или ведущий ушёл и экскурсия
  // ждёт его возвращения (sid записи null): слать некому.
  const guideOf = (gameId, sid) => {
    const room = roomOf(gameId);
    const member = find(gameId, sid);
    if (!room || !member || !member.following) {
      return null;
    }
    const tour = room.tours.get(member.following);
    if (!tour || tour.sid === null) {
      return null;
    }
    const guide = room.members.get(tour.sid);
    return guide ? toPublic(guide) : null;
  };

  // Идентификаторы всех экскурсий игры — ws.js сверяет по ним свои таймеры.
  const toursOf = (gameId) => {
    const room = roomOf(gameId);
    return room ? [...room.tours.keys()] : [];
  };

  // Полный снимок игры в порядке входа; копии, а не сами записи.
  const snapshot = (gameId) => {
    const room = roomOf(gameId);
    return room ? [...room.members.values()].map(toPublic) : [];
  };

  const size = (gameId) => {
    const room = roomOf(gameId);
    return room ? room.members.size : 0;
  };

  return {
    join,
    leave,
    get,
    setLeader,
    follow,
    expireTour,
    followersOf,
    guideOf,
    toursOf,
    snapshot,
    size,
  };
};

module.exports = {
  createRooms,
};
