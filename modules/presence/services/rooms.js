const { MAX_MEMBERS_PER_GAME } = require('../config');

// Состояние присутствия: кто сейчас онлайн в какой игре, кто ведёт и кто за
// кем следует. Только память процесса и никакой сети: сокеты держит ws.js,
// он же после каждой операции рассылает всем в игре снимок snapshot(). Так
// состояние проверяется тестами без единого соединения. Сервер запускается
// в одном экземпляре, поэтому Map в памяти достаточно.
//
// Участник (member): { sid, nickname, role, leader, following }, где sid —
// идентификатор соединения (две вкладки одного человека — два участника),
// role — число из config/game/user.js, following — sid ведущего или null.

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
  following: member.following,
});

const createRooms = ({ maxMembers = MAX_MEMBERS_PER_GAME } = {}) => {
  // '' + gameId → Map<sid, member>; ключ — строка, потому что gameId
  // приходит ObjectId'ом, а Map сравнивает объекты по ссылке.
  const games = new Map();

  const roomOf = (gameId) => games.get('' + gameId);

  const find = (gameId, sid) => {
    const room = roomOf(gameId);
    return (room && room.get(sid)) || null;
  };

  // Все, кто следовал за sid, остаются без ведущего.
  const dropFollowers = (room, sid) => {
    for (const member of room.values()) {
      if (member.following === sid) {
        member.following = null;
      }
    }
  };

  const join = (gameId, { sid, nickname, role }) => {
    let room = roomOf(gameId);
    if (room && room.size >= maxMembers) {
      throw refuse('full', `The game already has ${maxMembers} connections`);
    }
    if (!room) {
      room = new Map();
      games.set('' + gameId, room);
    }
    const member = { sid, nickname, role, leader: false, following: null };
    room.set(sid, member);
    return toPublic(member);
  };

  const leave = (gameId, sid) => {
    const room = roomOf(gameId);
    if (!room || !room.has(sid)) {
      return false;
    }
    room.delete(sid);
    dropFollowers(room, sid);
    if (room.size === 0) {
      games.delete('' + gameId);
    }
    return true;
  };

  const get = (gameId, sid) => {
    const member = find(gameId, sid);
    return member ? toPublic(member) : null;
  };

  const setLeader = (gameId, sid, on) => {
    const member = find(gameId, sid);
    if (!member) {
      return null;
    }
    if (on) {
      member.leader = true;
      member.following = null;
    } else {
      member.leader = false;
      dropFollowers(roomOf(gameId), sid);
    }
    return toPublic(member);
  };

  // targetSid = null — отписка; она разрешена всем, в том числе ведущему,
  // у которого следовать и так не за кем.
  const follow = (gameId, sid, targetSid) => {
    const member = find(gameId, sid);
    if (!member) {
      return null;
    }
    if (targetSid === null) {
      member.following = null;
      return toPublic(member);
    }
    if (member.leader) {
      throw refuse('leader', 'A leader cannot follow anyone: turn leader mode off first');
    }
    if (targetSid === sid) {
      throw refuse('self', 'You cannot follow yourself');
    }
    const target = find(gameId, targetSid);
    if (!target || !target.leader) {
      throw refuse('no-leader', 'That member is not leading now');
    }
    member.following = targetSid;
    return toPublic(member);
  };

  const followersOf = (gameId, sid) => {
    const room = roomOf(gameId);
    if (!room) {
      return [];
    }
    return [...room.values()]
      .filter((member) => member.following === sid)
      .map(toPublic);
  };

  // Полный снимок игры в порядке входа; копии, а не сами записи.
  const snapshot = (gameId) => {
    const room = roomOf(gameId);
    return room ? [...room.values()].map(toPublic) : [];
  };

  const size = (gameId) => {
    const room = roomOf(gameId);
    return room ? room.size : 0;
  };

  return {
    join,
    leave,
    get,
    setLeader,
    follow,
    followersOf,
    snapshot,
    size,
  };
};

module.exports = {
  createRooms,
};
