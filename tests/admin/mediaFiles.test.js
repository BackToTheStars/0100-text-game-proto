const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseHosts,
  normalizeGameId,
  collectFileItems,
  mergeBackfillReports,
  describeGameBackfill,
} = require('../../modules/admin/services/scripts/MediaFiles');

// Сбор элементов прохода «игра файла» и разбор параметров — без базы и без media.

const HOST = 'localhost:3011';
const MEDIA = `http://${HOST}`;
const gameId = (tail) => `66a3da300b474f60ae07d${tail}`;
const game = (tail, extra = {}) => ({ _id: gameId(tail), hash: `h${tail}`, ...extra });
const turn = (id, tail, fields) => ({ _id: `t${id}`, gameId: tail && gameId(tail), ...fields });

describe('parseHosts', () => {
  it('falls back to the host of the media url', () => {
    assert.deepEqual(parseHosts(undefined, 'http://localhost:3011'), [HOST]);
    assert.deepEqual(parseHosts('  ', 'https://media.braindance.space'), [
      'media.braindance.space',
    ]);
  });

  it('takes a comma list with or without a scheme and drops repeats', () => {
    assert.deepEqual(
      parseHosts(' localhost:3011, https://Media.Braindance.Space/x ,,media.braindance.space'),
      [HOST, 'media.braindance.space']
    );
  });

  it('rejects an entry that is not a host', () => {
    assert.throws(() => parseHosts('localhost:3011, http://'), /hosts/);
  });
});

describe('normalizeGameId', () => {
  it('is optional and lower-cases a valid id', () => {
    assert.equal(normalizeGameId(undefined), null);
    assert.equal(normalizeGameId(''), null);
    assert.equal(normalizeGameId(' 66A3DA300B474F60AE07D6D1 '), gameId('6d1'));
  });

  it('rejects anything but 24 hex characters', () => {
    assert.throws(() => normalizeGameId('6d1'), /gameId/);
    assert.throws(() => normalizeGameId(`${gameId('6d1')}0`), /gameId/);
  });
});

describe('collectFileItems', () => {
  it('matches only listed hosts and counts media-shaped links of other hosts', () => {
    const result = collectFileItems({
      games: [game('aaa')],
      turns: [
        turn(1, 'aaa', { imageUrl: `${MEDIA}/images/a.png` }),
        turn(2, 'aaa', { imageUrl: 'https://s6.gifyu.com/images/b.png' }),
        turn(3, 'aaa', { videoUrl: 'https://www.youtube.com/watch?v=abcdefgh' }),
        turn(4, 'aaa', { imageUrl: 'https://s6.gifyu.com/images/c.png' }),
      ],
      hosts: [HOST],
    });
    assert.deepEqual(result.items, [
      { type: 'images', filename: 'a.png', gameId: gameId('aaa'), gameHash: 'haaa' },
    ]);
    assert.deepEqual(result.foreignHosts, { 's6.gifyu.com': 2 });
    assert.equal(result.links, 1);
  });

  it('takes the type from the path, not from the field', () => {
    const result = collectFileItems({
      games: [game('aaa')],
      turns: [turn(1, 'aaa', { videoUrl: `${MEDIA}/images/v.mp4` })],
      hosts: [HOST],
    });
    assert.deepEqual(
      result.items.map(({ type, filename }) => [type, filename]),
      [['images', 'v.mp4']]
    );
  });

  it('sends one item for repeats inside a game and for the game image used by its turn', () => {
    const url = `${MEDIA}/images/cover.png`;
    const result = collectFileItems({
      games: [game('aaa', { image: url })],
      turns: [
        turn(1, 'aaa', { imageUrl: url }),
        turn(2, 'aaa', { videoPreview: url, pdfUrl: `${MEDIA}/pdfs/doc%20one.pdf` }),
      ],
      hosts: [HOST],
    });
    assert.deepEqual(
      result.items.map(({ type, filename }) => `${type}/${filename}`),
      ['images/cover.png', 'pdfs/doc one.pdf']
    );
    assert.equal(result.links, 4);
  });

  it('keeps a file of two games out of the items and lists it with both pairs', () => {
    const url = `${MEDIA}/images/shared.png`;
    const result = collectFileItems({
      games: [game('aaa'), game('bbb', { image: url })],
      turns: [turn(1, 'aaa', { imageUrl: url })],
      hosts: [HOST],
    });
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.multiGame, [
      {
        type: 'images',
        filename: 'shared.png',
        games: [
          { gameId: gameId('bbb'), gameHash: 'hbbb' },
          { gameId: gameId('aaa'), gameHash: 'haaa' },
        ],
      },
    ]);
  });

  it('reports links of turns whose game is gone or missing instead of sending them', () => {
    const result = collectFileItems({
      games: [game('aaa')],
      turns: [
        turn(1, 'ddd', { pdfUrl: `${MEDIA}/pdfs/old.pdf` }),
        turn(2, null, { audioUrl: `${MEDIA}/audios/lost.mp3` }),
        turn(3, 'aaa', { pdfUrl: `${MEDIA}/pdfs/old.pdf` }),
      ],
      hosts: [HOST],
    });
    assert.deepEqual(
      result.orphans.map(({ source, gameId: id, type, filename }) => [source, id, type, filename]),
      [
        ['turn t1.pdfUrl', gameId('ddd'), 'pdfs', 'old.pdf'],
        ['turn t2.audioUrl', null, 'audios', 'lost.mp3'],
      ]
    );
    assert.deepEqual(
      result.items.map(({ filename, gameId: id }) => [filename, id]),
      [['old.pdf', gameId('aaa')]]
    );
  });

  it('reports links of a listed host that are not /<type>/<name>', () => {
    const result = collectFileItems({
      games: [game('aaa')],
      turns: [
        turn(1, 'aaa', {
          imageUrl: `${MEDIA}/constructor/a.png`,
          videoUrl: `${MEDIA}/videos/a/b.mp4`,
          audioUrl: `${MEDIA}/audios/`,
          pdfUrl: '/pdfs/relative.pdf',
        }),
      ],
      hosts: [HOST],
    });
    assert.deepEqual(result.items, []);
    assert.deepEqual(
      result.badPaths.map(({ source }) => source),
      ['turn t1.imageUrl', 'turn t1.videoUrl', 'turn t1.audioUrl']
    );
  });

  it('does not send a file whose game has no address', () => {
    const result = collectFileItems({
      games: [{ _id: gameId('aaa') }],
      turns: [turn(1, 'aaa', { imageUrl: `${MEDIA}/images/a.png` })],
      hosts: [HOST],
    });
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.noAddress, [
      { type: 'images', filename: 'a.png', gameId: gameId('aaa') },
    ]);
  });

  it('narrows to one game but still sees that its file is shared with another', () => {
    const shared = `${MEDIA}/images/shared.png`;
    const result = collectFileItems({
      games: [game('aaa'), game('bbb')],
      turns: [
        turn(1, 'aaa', { imageUrl: `${MEDIA}/images/own.png` }),
        turn(2, 'aaa', { videoPreview: shared }),
        turn(3, 'bbb', { imageUrl: shared, pdfUrl: `${MEDIA}/pdfs/other.pdf` }),
        turn(4, 'bbb', { imageUrl: 'https://s1.gifyu.com/images/x.png' }),
      ],
      hosts: [HOST],
      gameId: gameId('aaa'),
    });
    assert.deepEqual(
      result.items.map(({ filename }) => filename),
      ['own.png']
    );
    assert.equal(result.multiGame.length, 1);
    assert.deepEqual(result.foreignHosts, {});
    assert.equal(result.links, 2);
  });
});

const backfillReport = (overrides = {}) => ({
  mode: 'report',
  gameId: null,
  items: { received: 1, repeated: 0, invalid: 0, ambiguous: 0, files: 1 },
  counts: { missing: 0, recordOnly: 0, fileOnly: 0, badMetadata: 0, conflict: 0, same: 0, pending: 1 },
  toWrite: { records: 1, files: 1 },
  written: null,
  byType: {
    images: {
      counts: { missing: 0, recordOnly: 0, fileOnly: 0, badMetadata: 0, conflict: 0, same: 0, pending: 1 },
      toWrite: { records: 1, files: 1 },
    },
  },
  marked: { records: 0, files: 0, byType: {} },
  lists: {
    invalid: [],
    ambiguous: [],
    missing: [],
    recordOnly: [],
    fileOnly: [],
    badMetadata: [],
    conflict: [],
    same: [],
    pending: [{ type: 'images', filename: 'a.png', gameId: gameId('aaa'), gameHash: 'haaa' }],
  },
  listLimit: 100,
  ...overrides,
});

describe('mergeBackfillReports', () => {
  it('adds up counts and lists of the chunks and keeps the last marked', () => {
    const merged = mergeBackfillReports(
      backfillReport({ mode: 'apply', written: { records: 1, files: 1 } }),
      backfillReport({
        mode: 'apply',
        written: { records: 1, files: 2 },
        marked: { records: 2, files: 3, byType: {} },
      })
    );
    assert.equal(merged.counts.pending, 2);
    assert.equal(merged.items.received, 2);
    assert.deepEqual(merged.written, { records: 2, files: 3 });
    assert.equal(merged.byType.images.toWrite.files, 2);
    assert.equal(merged.lists.pending.length, 2);
    assert.deepEqual(merged.marked, { records: 2, files: 3, byType: {} });
    assert.equal(merged.listLimit, 100);
  });
});

describe('describeGameBackfill', () => {
  const collected = (overrides = {}) => ({
    links: 1,
    items: [{ type: 'images', filename: 'a.png', gameId: gameId('aaa'), gameHash: 'haaa' }],
    multiGame: [],
    noAddress: [],
    orphans: [],
    badPaths: [],
    foreignHosts: {},
    ...overrides,
  });
  const render = (collectedOverrides, report = backfillReport()) =>
    describeGameBackfill({
      hosts: [HOST],
      gameId: null,
      gamesCount: 2,
      turnsCount: 3,
      collected: collected(collectedOverrides),
      report,
    });

  it('lists what is to be written and says that nothing else is left out', () => {
    const lines = render();
    assert.ok(lines.includes('К записи (1):'));
    assert.ok(lines.includes(`  images/a.png → ${gameId('aaa')} (haaa)`));
    assert.deepEqual(lines.slice(-2), ['Запуск не тронет и почему:', '  ничего']);
  });

  it('explains untouched files and cuts long lists, keeping the full count', () => {
    const multiGame = Array.from({ length: 60 }, (_, i) => ({
      type: 'images',
      filename: `m${i}.png`,
      games: [
        { gameId: gameId('aaa'), gameHash: 'haaa' },
        { gameId: gameId('bbb'), gameHash: 'hbbb' },
      ],
    }));
    const lines = render({ multiGame, foreignHosts: { 's1.gifyu.com': 3, 's6.gifyu.com': 9 } });
    const start = lines.indexOf('Запуск не тронет и почему:');
    assert.ok(start > 0);
    const untouched = lines.slice(start + 1);
    assert.equal(untouched[0], '  Файлы нескольких игр — одну игру не выбрать (60):');
    assert.ok(untouched.includes('    … и ещё 10'));
    assert.ok(untouched.indexOf('    s6.gifyu.com: 9') < untouched.indexOf('    s1.gifyu.com: 3'));
  });
});
