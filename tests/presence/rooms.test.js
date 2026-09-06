const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createRooms } = require('../../modules/presence/services/rooms');
const { MAX_MEMBERS_PER_GAME } = require('../../modules/presence/config');

// Состояние присутствия без сокетов: комнаты, экскурсия и её гид, подписки,
// ожидание вернувшегося гида, снимок. Запуск: npm test (node --test).

const GAME = 'game-1';
const OTHER_GAME = 'game-2';

const owner = { sid: 'sid-owner', nickname: 'Owner', role: 3 };
const player = { sid: 'sid-player', nickname: 'Player', role: 2 };
const visitor = { sid: 'sid-visitor', nickname: 'Visitor', role: 1 };

const seeded = () => {
  const rooms = createRooms();
  rooms.join(GAME, owner);
  rooms.join(GAME, player);
  rooms.join(GAME, visitor);
  return rooms;
};

const sids = (members) => members.map((member) => member.sid);

// Экскурсия, которую ведёт sid: id берётся из снимка, как его берёт клиент.
const tourOf = (rooms, gameId, sid) => rooms.get(gameId, sid).tour;

const lead = (rooms, gameId, sid, tourId) => {
  rooms.setLeader(gameId, sid, true, tourId);
  return tourOf(rooms, gameId, sid);
};

describe('join / leave', () => {
  it('join returns a member of the contract shape and snapshot lists members in join order', () => {
    const rooms = createRooms();
    const joined = rooms.join(GAME, owner);
    assert.deepEqual(joined, {
      sid: 'sid-owner',
      nickname: 'Owner',
      role: 3,
      leader: false,
      tour: null,
      following: null,
    });
    rooms.join(GAME, player);
    assert.deepEqual(sids(rooms.snapshot(GAME)), ['sid-owner', 'sid-player']);
    assert.equal(rooms.size(GAME), 2);
  });

  it('leave removes the member; the last one leaving empties the game', () => {
    const rooms = seeded();
    assert.deepEqual(rooms.leave(GAME, player.sid), { tour: null, closed: [] });
    assert.deepEqual(sids(rooms.snapshot(GAME)), ['sid-owner', 'sid-visitor']);
    assert.equal(rooms.leave(GAME, 'sid-unknown'), null);
    rooms.leave(GAME, owner.sid);
    rooms.leave(GAME, visitor.sid);
    assert.deepEqual(rooms.snapshot(GAME), []);
    assert.equal(rooms.size(GAME), 0);
  });

  it('the last one leaving takes the tours of the game with them', () => {
    const rooms = createRooms();
    rooms.join(GAME, owner);
    const tour = lead(rooms, GAME, owner.sid);
    assert.deepEqual(rooms.toursOf(GAME), [tour]);

    assert.deepEqual(rooms.leave(GAME, owner.sid), { tour: null, closed: [tour] });
    assert.deepEqual(rooms.toursOf(GAME), []);
    assert.equal(rooms.expireTour(GAME, tour), false);
  });

  it('games are isolated from each other', () => {
    const rooms = seeded();
    rooms.join(OTHER_GAME, { sid: 'sid-other', nickname: 'Other', role: 1 });
    assert.deepEqual(sids(rooms.snapshot(OTHER_GAME)), ['sid-other']);
    assert.equal(rooms.get(OTHER_GAME, owner.sid), null);
    assert.equal(rooms.snapshot('game-empty').length, 0);
  });

  it('a game id is matched by its string form (ObjectId and string are the same key)', () => {
    const rooms = createRooms();
    const objectId = { toString: () => 'abc' };
    rooms.join(objectId, owner);
    assert.deepEqual(sids(rooms.snapshot('abc')), ['sid-owner']);
  });
});

describe('starting and ending a tour', () => {
  it('lead on hands out a tour id of 8 hex characters, different for two guides', () => {
    const rooms = seeded();
    const first = lead(rooms, GAME, owner.sid);
    const second = lead(rooms, GAME, player.sid);
    assert.match(first, /^[0-9a-f]{8}$/);
    assert.match(second, /^[0-9a-f]{8}$/);
    assert.notEqual(first, second);
    assert.deepEqual(rooms.toursOf(GAME).sort(), [first, second].sort());
    assert.equal(rooms.get(GAME, owner.sid).leader, true);
  });

  it('lead on resets my own following', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    assert.equal(rooms.get(GAME, player.sid).following, tour);

    const promoted = rooms.setLeader(GAME, player.sid, true);
    assert.equal(promoted.leader, true);
    assert.equal(promoted.following, null);
    assert.notEqual(promoted.tour, tour);
  });

  it('lead on again while already leading is a no-op and keeps the same tour', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);

    const again = rooms.setLeader(GAME, owner.sid, true);
    assert.equal(again.tour, tour);
    assert.deepEqual(rooms.toursOf(GAME), [tour]);
    assert.deepEqual(sids(rooms.followersOf(GAME, owner.sid)), ['sid-player']);
  });

  it('lead off drops the followers and removes the tour', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    rooms.follow(GAME, visitor.sid, tour);
    assert.deepEqual(sids(rooms.followersOf(GAME, owner.sid)), ['sid-player', 'sid-visitor']);

    const ended = rooms.setLeader(GAME, owner.sid, false);
    assert.equal(ended.leader, false);
    assert.equal(ended.tour, null);
    assert.deepEqual(rooms.toursOf(GAME), []);
    assert.deepEqual(rooms.followersOf(GAME, owner.sid), []);
    assert.equal(rooms.get(GAME, player.sid).following, null);
    assert.equal(rooms.get(GAME, visitor.sid).following, null);
  });

  it('lead off from someone who is not leading changes nothing', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    assert.equal(rooms.setLeader(GAME, player.sid, false).following, tour);
    assert.deepEqual(rooms.toursOf(GAME), [tour]);
  });

  it('setLeader for an unknown member returns null and changes nothing', () => {
    const rooms = seeded();
    assert.equal(rooms.setLeader(GAME, 'sid-unknown', true), null);
    assert.equal(rooms.snapshot(GAME).some((member) => member.leader), false);
    assert.deepEqual(rooms.toursOf(GAME), []);
  });
});

describe('the guide drops out and comes back', () => {
  it('a guide leaving keeps the tour waiting and the followers subscribed', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);

    assert.deepEqual(rooms.leave(GAME, owner.sid), { tour, closed: [] });
    assert.deepEqual(sids(rooms.snapshot(GAME)), ['sid-player', 'sid-visitor']);
    assert.deepEqual(rooms.toursOf(GAME), [tour]);
    assert.equal(rooms.get(GAME, player.sid).following, tour);
  });

  it('the same nickname and role get the tour back with its followers', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    rooms.leave(GAME, owner.sid);

    // Новое соединение того же человека: ник и роль из токена те же, sid другой.
    rooms.join(GAME, { sid: 'sid-owner-2', nickname: 'Owner', role: 3 });
    const back = rooms.setLeader(GAME, 'sid-owner-2', true, tour);
    assert.equal(back.tour, tour);
    assert.equal(back.leader, true);
    assert.deepEqual(rooms.toursOf(GAME), [tour]);
    assert.deepEqual(sids(rooms.followersOf(GAME, 'sid-owner-2')), ['sid-player']);
    assert.equal(rooms.get(GAME, player.sid).following, tour);
    // Гид вернулся — ожидание больше не истекает.
    assert.equal(rooms.expireTour(GAME, tour), false);
  });

  it('another nickname gets a new tour and leaves the waiting one alone', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, visitor.sid, tour);
    rooms.leave(GAME, owner.sid);

    const stranger = lead(rooms, GAME, player.sid, tour);
    assert.notEqual(stranger, tour);
    assert.deepEqual(rooms.toursOf(GAME).sort(), [stranger, tour].sort());
    assert.equal(rooms.get(GAME, visitor.sid).following, tour);
    assert.deepEqual(rooms.followersOf(GAME, player.sid), []);
  });

  it('a tour id that is unknown or still led by someone else starts a new tour', () => {
    const rooms = seeded();
    const live = lead(rooms, GAME, owner.sid);
    const invented = lead(rooms, GAME, player.sid, 'deadbeef');
    assert.notEqual(invented, 'deadbeef');

    rooms.setLeader(GAME, player.sid, false);
    const taken = lead(rooms, GAME, player.sid, live);
    assert.notEqual(taken, live);
    assert.equal(rooms.get(GAME, owner.sid).tour, live);
  });

  it('expireTour drops the followers once, and only while the tour is waiting', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    rooms.follow(GAME, visitor.sid, tour);
    rooms.leave(GAME, owner.sid);

    assert.equal(rooms.expireTour(GAME, tour), true);
    assert.equal(rooms.get(GAME, player.sid).following, null);
    assert.equal(rooms.get(GAME, visitor.sid).following, null);
    assert.deepEqual(rooms.toursOf(GAME), []);

    assert.equal(rooms.expireTour(GAME, tour), false);
    assert.equal(rooms.expireTour(GAME, 'deadbeef'), false);
    assert.equal(rooms.expireTour('game-empty', tour), false);
  });

  it('a tour that is still led does not expire', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    assert.equal(rooms.expireTour(GAME, tour), false);
    assert.equal(rooms.get(GAME, player.sid).following, tour);
  });
});

describe('follow', () => {
  it('follows a tour, switches to another one, unfollows with null', () => {
    const rooms = seeded();
    const ownerTour = lead(rooms, GAME, owner.sid);
    const playerTour = lead(rooms, GAME, player.sid);

    assert.equal(rooms.follow(GAME, visitor.sid, ownerTour).following, ownerTour);
    assert.equal(rooms.follow(GAME, visitor.sid, playerTour).following, playerTour);
    assert.deepEqual(rooms.followersOf(GAME, owner.sid), []);
    assert.deepEqual(sids(rooms.followersOf(GAME, player.sid)), ['sid-visitor']);

    assert.equal(rooms.follow(GAME, visitor.sid, null).following, null);
    assert.deepEqual(rooms.followersOf(GAME, player.sid), []);
  });

  it('a tour waiting for its guide still accepts a follower', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.leave(GAME, owner.sid);
    assert.equal(rooms.follow(GAME, visitor.sid, tour).following, tour);
  });

  it('a guide is refused with code "leader"', () => {
    const rooms = seeded();
    lead(rooms, GAME, owner.sid);
    const playerTour = lead(rooms, GAME, player.sid);
    assert.throws(() => rooms.follow(GAME, owner.sid, playerTour), { code: 'leader' });
    assert.equal(rooms.get(GAME, owner.sid).following, null);
  });

  it('unfollow (null) from a guide is a no-op, not an error', () => {
    const rooms = seeded();
    lead(rooms, GAME, owner.sid);
    assert.equal(rooms.follow(GAME, owner.sid, null).following, null);
    assert.equal(rooms.get(GAME, owner.sid).leader, true);
  });

  it('an unknown tour is refused with code "no-leader"', () => {
    const rooms = seeded();
    lead(rooms, GAME, owner.sid);
    assert.throws(() => rooms.follow(GAME, visitor.sid, 'deadbeef'), { code: 'no-leader' });
    assert.equal(rooms.get(GAME, visitor.sid).following, null);
  });

  it('an ended tour is refused with code "no-leader"', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.setLeader(GAME, owner.sid, false);
    assert.throws(() => rooms.follow(GAME, visitor.sid, tour), { code: 'no-leader' });
  });

  it('follow from an unknown member returns null', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    assert.equal(rooms.follow(GAME, 'sid-unknown', tour), null);
  });

  it('followersOf someone who leads nothing is empty', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    assert.deepEqual(rooms.followersOf(GAME, visitor.sid), []);
    assert.deepEqual(rooms.followersOf(GAME, 'sid-unknown'), []);
    assert.deepEqual(rooms.followersOf('game-empty', owner.sid), []);
  });
});

describe('guideOf: the guide of the tour I follow', () => {
  it('a follower gets the public record of their guide', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    assert.deepEqual(rooms.guideOf(GAME, player.sid), {
      sid: 'sid-owner',
      nickname: 'Owner',
      role: 3,
      leader: true,
      tour,
      following: null,
    });
    assert.deepEqual(rooms.guideOf(GAME, player.sid), rooms.get(GAME, owner.sid));
  });

  it('someone following nobody gets null, the guide included', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    assert.equal(rooms.guideOf(GAME, visitor.sid), null);
    assert.equal(rooms.guideOf(GAME, owner.sid), null);
    assert.equal(rooms.guideOf(GAME, 'sid-unknown'), null);
    assert.equal(rooms.guideOf('game-empty', player.sid), null);
  });

  it('a guide waiting to come back is null; once back, the new record', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    rooms.leave(GAME, owner.sid);
    assert.equal(rooms.get(GAME, player.sid).following, tour);
    assert.equal(rooms.guideOf(GAME, player.sid), null);

    rooms.join(GAME, { sid: 'sid-owner-2', nickname: 'Owner', role: 3 });
    rooms.setLeader(GAME, 'sid-owner-2', true, tour);
    assert.equal(rooms.guideOf(GAME, player.sid).sid, 'sid-owner-2');
    assert.equal(rooms.guideOf(GAME, player.sid).tour, tour);
  });

  it('null after the tour ends or expires, and after unfollowing', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);
    rooms.follow(GAME, visitor.sid, tour);

    rooms.follow(GAME, visitor.sid, null);
    assert.equal(rooms.guideOf(GAME, visitor.sid), null);

    rooms.setLeader(GAME, owner.sid, false);
    assert.equal(rooms.guideOf(GAME, player.sid), null);

    const again = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, again);
    rooms.leave(GAME, owner.sid);
    rooms.expireTour(GAME, again);
    assert.equal(rooms.guideOf(GAME, player.sid), null);
  });

  it('follows the switch to another tour and is a copy, not the state', () => {
    const rooms = seeded();
    const ownerTour = lead(rooms, GAME, owner.sid);
    const playerTour = lead(rooms, GAME, player.sid);
    rooms.follow(GAME, visitor.sid, ownerTour);
    assert.equal(rooms.guideOf(GAME, visitor.sid).sid, 'sid-owner');
    rooms.follow(GAME, visitor.sid, playerTour);
    assert.equal(rooms.guideOf(GAME, visitor.sid).sid, 'sid-player');

    const copy = rooms.guideOf(GAME, visitor.sid);
    copy.leader = false;
    copy.tour = 'hacked';
    assert.equal(rooms.get(GAME, player.sid).leader, true);
    assert.equal(rooms.get(GAME, player.sid).tour, playerTour);
  });
});

describe('snapshot', () => {
  it('has exactly the member fields and is a copy of the state', () => {
    const rooms = seeded();
    const tour = lead(rooms, GAME, owner.sid);
    rooms.follow(GAME, player.sid, tour);

    const members = rooms.snapshot(GAME);
    assert.deepEqual(members, [
      { sid: 'sid-owner', nickname: 'Owner', role: 3, leader: true, tour, following: null },
      { sid: 'sid-player', nickname: 'Player', role: 2, leader: false, tour: null, following: tour },
      { sid: 'sid-visitor', nickname: 'Visitor', role: 1, leader: false, tour: null, following: null },
    ]);
    for (const member of members) {
      assert.deepEqual(Object.keys(member), [
        'sid',
        'nickname',
        'role',
        'leader',
        'tour',
        'following',
      ]);
    }

    members[0].leader = false;
    members[1].following = 'sid-hacked';
    assert.equal(rooms.get(GAME, owner.sid).leader, true);
    assert.equal(rooms.get(GAME, player.sid).following, tour);
  });
});

describe('limit per game', () => {
  it('refuses the join above the limit with code "full" and keeps the room intact', () => {
    const rooms = createRooms({ maxMembers: 2 });
    rooms.join(GAME, owner);
    rooms.join(GAME, player);
    assert.throws(() => rooms.join(GAME, visitor), { code: 'full' });
    assert.deepEqual(sids(rooms.snapshot(GAME)), ['sid-owner', 'sid-player']);
    // другой игры лимит не касается
    rooms.join(OTHER_GAME, visitor);
    assert.equal(rooms.size(OTHER_GAME), 1);
  });

  it('a member leaving frees a seat', () => {
    const rooms = createRooms({ maxMembers: 1 });
    rooms.join(GAME, owner);
    rooms.leave(GAME, owner.sid);
    assert.doesNotThrow(() => rooms.join(GAME, player));
  });

  it('the default limit is the configured constant', () => {
    const rooms = createRooms();
    for (let i = 0; i < MAX_MEMBERS_PER_GAME; i++) {
      rooms.join(GAME, { sid: `sid-${i}`, nickname: `n${i}`, role: 1 });
    }
    assert.equal(rooms.size(GAME), MAX_MEMBERS_PER_GAME);
    assert.throws(() => rooms.join(GAME, { sid: 'sid-extra', nickname: 'x', role: 1 }), {
      code: 'full',
    });
  });
});
