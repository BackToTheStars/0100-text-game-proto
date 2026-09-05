const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { createRooms } = require('../../modules/presence/services/rooms');
const { MAX_MEMBERS_PER_GAME } = require('../../modules/presence/config');

// Состояние присутствия без сокетов: комнаты, ведущий, подписки, снимок.
// Запуск: npm test (node --test).

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

describe('join / leave', () => {
  it('join returns a member of the contract shape and snapshot lists members in join order', () => {
    const rooms = createRooms();
    const joined = rooms.join(GAME, owner);
    assert.deepEqual(joined, {
      sid: 'sid-owner',
      nickname: 'Owner',
      role: 3,
      leader: false,
      following: null,
    });
    rooms.join(GAME, player);
    assert.deepEqual(sids(rooms.snapshot(GAME)), ['sid-owner', 'sid-player']);
    assert.equal(rooms.size(GAME), 2);
  });

  it('leave removes the member; the last one leaving empties the game', () => {
    const rooms = seeded();
    assert.equal(rooms.leave(GAME, player.sid), true);
    assert.deepEqual(sids(rooms.snapshot(GAME)), ['sid-owner', 'sid-visitor']);
    assert.equal(rooms.leave(GAME, 'sid-unknown'), false);
    rooms.leave(GAME, owner.sid);
    rooms.leave(GAME, visitor.sid);
    assert.deepEqual(rooms.snapshot(GAME), []);
    assert.equal(rooms.size(GAME), 0);
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

describe('leader mode', () => {
  it('lead on marks the member as leader and resets their own following', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    rooms.follow(GAME, player.sid, owner.sid);
    assert.equal(rooms.get(GAME, player.sid).following, 'sid-owner');

    const promoted = rooms.setLeader(GAME, player.sid, true);
    assert.equal(promoted.leader, true);
    assert.equal(promoted.following, null);
  });

  it('lead off resets following of everyone who followed that leader', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    rooms.follow(GAME, player.sid, owner.sid);
    rooms.follow(GAME, visitor.sid, owner.sid);
    assert.deepEqual(sids(rooms.followersOf(GAME, owner.sid)), ['sid-player', 'sid-visitor']);

    const demoted = rooms.setLeader(GAME, owner.sid, false);
    assert.equal(demoted.leader, false);
    assert.deepEqual(rooms.followersOf(GAME, owner.sid), []);
    assert.equal(rooms.get(GAME, player.sid).following, null);
    assert.equal(rooms.get(GAME, visitor.sid).following, null);
  });

  it('a leader leaving resets following of their followers', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    rooms.follow(GAME, player.sid, owner.sid);
    rooms.leave(GAME, owner.sid);
    assert.equal(rooms.get(GAME, player.sid).following, null);
    assert.deepEqual(rooms.followersOf(GAME, owner.sid), []);
  });

  it('setLeader for an unknown member returns null and changes nothing', () => {
    const rooms = seeded();
    assert.equal(rooms.setLeader(GAME, 'sid-unknown', true), null);
    assert.equal(rooms.snapshot(GAME).some((member) => member.leader), false);
  });
});

describe('follow', () => {
  it('follows a leader, switches to another leader, unfollows with null', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    rooms.setLeader(GAME, player.sid, true);

    assert.equal(rooms.follow(GAME, visitor.sid, owner.sid).following, 'sid-owner');
    assert.equal(rooms.follow(GAME, visitor.sid, player.sid).following, 'sid-player');
    assert.deepEqual(rooms.followersOf(GAME, owner.sid), []);
    assert.deepEqual(sids(rooms.followersOf(GAME, player.sid)), ['sid-visitor']);

    assert.equal(rooms.follow(GAME, visitor.sid, null).following, null);
    assert.deepEqual(rooms.followersOf(GAME, player.sid), []);
  });

  it('a leader is refused with code "leader"', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    rooms.setLeader(GAME, player.sid, true);
    assert.throws(() => rooms.follow(GAME, owner.sid, player.sid), { code: 'leader' });
    assert.equal(rooms.get(GAME, owner.sid).following, null);
  });

  it('unfollow (null) from a leader is a no-op, not an error', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    assert.equal(rooms.follow(GAME, owner.sid, null).following, null);
    assert.equal(rooms.get(GAME, owner.sid).leader, true);
  });

  it('a member who is not leading is refused with code "no-leader"', () => {
    const rooms = seeded();
    assert.throws(() => rooms.follow(GAME, visitor.sid, player.sid), { code: 'no-leader' });
    assert.equal(rooms.get(GAME, visitor.sid).following, null);
  });

  it('an unknown sid is refused with code "no-leader"', () => {
    const rooms = seeded();
    assert.throws(() => rooms.follow(GAME, visitor.sid, 'sid-unknown'), { code: 'no-leader' });
  });

  it('oneself is refused with code "self"', () => {
    const rooms = seeded();
    assert.throws(() => rooms.follow(GAME, visitor.sid, visitor.sid), { code: 'self' });
  });

  it('follow from an unknown member returns null', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    assert.equal(rooms.follow(GAME, 'sid-unknown', owner.sid), null);
  });
});

describe('snapshot', () => {
  it('has exactly the member fields and is a copy of the state', () => {
    const rooms = seeded();
    rooms.setLeader(GAME, owner.sid, true);
    rooms.follow(GAME, player.sid, owner.sid);

    const members = rooms.snapshot(GAME);
    assert.deepEqual(members, [
      { sid: 'sid-owner', nickname: 'Owner', role: 3, leader: true, following: null },
      { sid: 'sid-player', nickname: 'Player', role: 2, leader: false, following: 'sid-owner' },
      { sid: 'sid-visitor', nickname: 'Visitor', role: 1, leader: false, following: null },
    ]);
    for (const member of members) {
      assert.deepEqual(Object.keys(member), ['sid', 'nickname', 'role', 'leader', 'following']);
    }

    members[0].leader = false;
    members[1].following = 'sid-hacked';
    assert.equal(rooms.get(GAME, owner.sid).leader, true);
    assert.equal(rooms.get(GAME, player.sid).following, 'sid-owner');
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
