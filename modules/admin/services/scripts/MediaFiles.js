const axios = require('axios');

const Game = require('../../../game/models/Game');
const Turn = require('../../../game/models/Turn');
const { STATIC_MEDIA_URL } = require('../../../../config/url');
const { getServiceToken } = require('../../../game/services/game');
const {
  GAME_FIELDS,
  TURN_FIELDS,
  mediaRequestError,
  parseMediaPath,
} = require('../../../game/services/mediaRelocate');

const MAINTENANCE_OPERATION = 'files_maintenance';
const DEAD_KEYS_PATH = '/files/dead-keys';
const BACKFILL_PATH = '/files/game-backfill';
const MEDIA_TIMEOUT = 60 * 1000;
// media принимает до 10000 элементов за запрос; кусок меньше, чтобы запуск
// укладывался в таймаут.
const ITEMS_PER_REQUEST = 2000;
const LIST_LIMIT = 50;
const MEDIA_TYPES = ['images', 'videos', 'audios', 'pdfs'];
const VERDICT_LABELS = {
  pending: 'к записи',
  same: 'та же пара',
  missing: 'нет ни записи, ни файла',
  recordOnly: 'запись без файла',
  fileOnly: 'файл без записи',
  badMetadata: 'metadata не объект',
  conflict: 'другая пара',
};
const VERDICTS = Object.keys(VERDICT_LABELS);
const GAME_ID_RE = /^[0-9a-f]{24}$/;

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === '';

// Хосты через запятую, со схемой или без; сравниваются с URL.host ссылок.
const parseHosts = (value, fallback = STATIC_MEDIA_URL) => {
  const entries = isBlank(value) ? [fallback] : String(value).split(',');
  const hosts = [];
  for (const raw of entries) {
    const entry = String(raw).trim();
    if (!entry) {
      continue;
    }
    const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(entry)
      ? entry
      : `http://${entry}`;
    let host = '';
    try {
      host = new URL(withScheme).host;
    } catch {
      host = '';
    }
    if (!host) {
      throw new Error(`hosts: не удалось разобрать «${entry}»`);
    }
    if (!hosts.includes(host)) {
      hosts.push(host);
    }
  }
  if (hosts.length === 0) {
    throw new Error('hosts: пустой список');
  }
  return hosts;
};

const normalizeGameId = (value) => {
  if (isBlank(value)) {
    return null;
  }
  const gameId = String(value).trim().toLowerCase();
  if (!GAME_ID_RE.test(gameId)) {
    throw new Error(
      `gameId: ожидалось 24 шестнадцатеричных символа, получено «${String(value).slice(0, 64)}»`
    );
  }
  return gameId;
};

const hostOf = (url) => {
  if (typeof url !== 'string' || !url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.host
      : null;
  } catch {
    return null;
  }
};

// Ссылки ходов и игр → элементы прохода «игра файла» и всё, что в них не попало.
// gameId сужает результат до одной игры, но файлы нескольких игр ищутся по всем.
const collectFileItems = ({ games, turns, hosts, gameId = null }) => {
  const listed = new Set(hosts);
  const gamesById = new Map(games.map((game) => [String(game._id), game]));
  const inScope = (id) => !gameId || id === gameId;
  const files = new Map();
  const result = {
    links: 0,
    items: [],
    multiGame: [],
    noAddress: [],
    orphans: [],
    badPaths: [],
    foreignHosts: {},
  };

  const addLink = (url, refGameId, source) => {
    const host = hostOf(url);
    if (!host) {
      return;
    }
    const file = parseMediaPath(url);
    if (!listed.has(host)) {
      if (file && inScope(refGameId)) {
        result.foreignHosts[host] = (result.foreignHosts[host] || 0) + 1;
      }
      return;
    }
    if (!file) {
      if (inScope(refGameId)) {
        result.badPaths.push({ source, url });
      }
      return;
    }
    const { type, filename } = file;
    if (!gamesById.has(refGameId)) {
      if (inScope(refGameId)) {
        result.links += 1;
        result.orphans.push({ source, gameId: refGameId, type, filename });
      }
      return;
    }
    if (inScope(refGameId)) {
      result.links += 1;
    }
    const key = `${type}/${filename}`;
    if (!files.has(key)) {
      files.set(key, { type, filename, gameIds: new Set() });
    }
    files.get(key).gameIds.add(refGameId);
  };

  for (const game of games) {
    for (const [field] of GAME_FIELDS) {
      addLink(game[field], String(game._id), `game ${game._id}.${field}`);
    }
  }
  for (const turn of turns) {
    const refGameId = turn.gameId ? String(turn.gameId) : null;
    for (const [field] of TURN_FIELDS) {
      addLink(turn[field], refGameId, `turn ${turn._id}.${field}`);
    }
  }

  for (const { type, filename, gameIds } of files.values()) {
    if (gameId && !gameIds.has(gameId)) {
      continue;
    }
    const ids = [...gameIds];
    if (ids.length > 1) {
      const games = ids.map((id) => ({
        gameId: id,
        gameHash: gamesById.get(id).hash || null,
      }));
      result.multiGame.push({ type, filename, games });
      continue;
    }
    const { hash } = gamesById.get(ids[0]);
    if (!hash) {
      result.noAddress.push({ type, filename, gameId: ids[0] });
      continue;
    }
    result.items.push({ type, filename, gameId: ids[0], gameHash: hash });
  }
  return result;
};

const addUp = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a + b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.concat(b);
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const sum = { ...a };
    for (const key of Object.keys(b)) {
      sum[key] = key in a ? addUp(a[key], b[key]) : b[key];
    }
    return sum;
  }
  return b ?? a;
};

// marked — состояние базы после запроса, поэтому берётся у последнего куска.
const mergeBackfillReports = (a, b) => ({
  ...b,
  items: addUp(a.items, b.items),
  counts: addUp(a.counts, b.counts),
  toWrite: addUp(a.toWrite, b.toWrite),
  written: addUp(a.written, b.written),
  byType: addUp(a.byType, b.byType),
  lists: addUp(a.lists, b.lists),
});

const postToMedia = async (path, data) => {
  try {
    const resp = await axios({
      method: 'post',
      url: STATIC_MEDIA_URL + path,
      headers: {
        Authorization: 'Bearer ' + getServiceToken(MAINTENANCE_OPERATION),
        'Content-Type': 'application/json',
      },
      data,
      timeout: MEDIA_TIMEOUT,
    });
    return resp.data;
  } catch (err) {
    throw mediaRequestError(err);
  }
};

const sendItems = async (mode, items, gameId) => {
  let merged = null;
  let from = 0;
  do {
    const report = await postToMedia(BACKFILL_PATH, {
      mode,
      ...(gameId ? { gameId } : {}),
      items: items.slice(from, from + ITEMS_PER_REQUEST),
    });
    merged = merged ? mergeBackfillReports(merged, report) : report;
    from += ITEMS_PER_REQUEST;
  } while (from < items.length);
  return merged;
};

const places = ({ records, files }) => `опись ${records}, GridFS ${files}`;
const fileName = ({ type, filename }) => `${type}/${filename}`;
const gamePair = ({ gameId, gameHash }) => `${gameId} (${gameHash})`;
const placeLabel = (place) =>
  place === 'record' || place === 'records' ? 'опись' : 'GridFS';

const limited = (list, format, total = list.length, indent = '    ') => {
  const lines = list.slice(0, LIST_LIMIT).map((entry) => indent + format(entry));
  if (total > lines.length) {
    lines.push(`${indent}… и ещё ${total - lines.length}`);
  }
  return lines;
};

// sections: [заголовок, полное число, список (может быть обрезан), формат строки].
const untouchedBlock = (title, sections) => {
  const lines = [];
  for (const [label, total, list, format] of sections) {
    if (total) {
      lines.push(`  ${label} (${total}):`, ...limited(list, format, total));
    }
  }
  return [title, ...(lines.length ? lines : ['  ничего'])];
};

const describeVerdicts = (counts, { skipZero = false } = {}) =>
  VERDICTS.filter((verdict) => !skipZero || counts[verdict])
    .map((verdict) => `${VERDICT_LABELS[verdict]} ${counts[verdict] || 0}`)
    .join(', ');

const describeTypeCounts = (list) => {
  const counts = {};
  for (const { type } of list) {
    counts[type] = (counts[type] || 0) + 1;
  }
  return MEDIA_TYPES.filter((type) => counts[type])
    .map((type) => `${type} ${counts[type]}`)
    .join(', ');
};

const describeGameBackfill = ({
  hosts,
  gameId,
  gameHash,
  gamesCount,
  turnsCount,
  collected,
  report,
}) => {
  const { items, multiGame, noAddress, orphans, badPaths } = collected;
  const { counts, lists } = report;
  const apply = report.mode === 'apply';
  const lines = [
    `Игра файлов media — ${apply ? 'запуск' : 'отчёт'}`,
    `Хосты media: ${hosts.join(', ')}`,
    `Игра: ${gameId ? `${gameId} (${gameHash})` : 'все игры'}`,
    `Просмотрено: игр ${gamesCount}, ходов ${turnsCount}; ` +
      `ссылок на файлы этих хостов ${collected.links}`,
    `Отправлено в media: ${items.length}` +
      (items.length ? ` (${describeTypeCounts(items)})` : ''),
    `Вердикты media: ${describeVerdicts(counts)}`,
  ];
  for (const type of MEDIA_TYPES) {
    const entry = report.byType && report.byType[type];
    if (entry && VERDICTS.some((verdict) => entry.counts[verdict])) {
      lines.push(`  ${type}: ${describeVerdicts(entry.counts, { skipZero: true })}`);
    }
  }
  lines.push(`Мест без пары к записи: ${places(report.toWrite)}`);
  if (report.written) {
    lines.push(`Записано: ${places(report.written)}`);
  }
  lines.push(`С меткой прохода: ${places(report.marked)}`);
  if (counts.pending) {
    lines.push(
      `К записи (${counts.pending}):`,
      ...limited(
        lists.pending,
        (f) => `${fileName(f)} → ${gamePair(f)}`,
        counts.pending,
        '  '
      )
    );
  }

  const foreign = Object.entries(collected.foreignHosts).sort(
    (a, b) => b[1] - a[1]
  );
  const title = apply ? 'Не тронуто и почему:' : 'Запуск не тронет и почему:';
  return lines.concat(
    untouchedBlock(title, [
      [
        'Файлы нескольких игр — одну игру не выбрать',
        multiGame.length,
        multiGame,
        (f) => `${fileName(f)}: ${f.games.map(gamePair).join('; ')}`,
      ],
      [
        'Ссылки ходов удалённых игр или без игры — игры нет',
        orphans.length,
        orphans,
        (o) => `${o.source} (игра ${o.gameId || '—'}): ${fileName(o)}`,
      ],
      [
        'Файлы игр без адреса — media нужен gameHash',
        noAddress.length,
        noAddress,
        (f) => `${fileName(f)} → ${f.gameId}`,
      ],
      [
        'Ссылки на хосты media не вида /<тип>/<имя>',
        badPaths.length,
        badPaths,
        (b) => `${b.source}: ${b.url}`,
      ],
      [
        'Хосты не из списка со ссылками вида /<тип>/<имя> — если это media, ' +
          'повторить с ними в hosts',
        foreign.length,
        foreign,
        ([host, count]) => `${host}: ${count}`,
      ],
      ['Нет ни записи, ни файла в media', counts.missing, lists.missing, fileName],
      ['Запись без файла', counts.recordOnly, lists.recordOnly, fileName],
      ['Файл без записи', counts.fileOnly, lists.fileOnly, fileName],
      ['metadata не объект', counts.badMetadata, lists.badMetadata, fileName],
      [
        'Уже стоит другая или неполная пара — не перезаписывается',
        counts.conflict,
        lists.conflict,
        (f) =>
          `${fileName(f)} → ${gamePair(f)}; стоит: ` +
          f.existing.map((e) => `${placeLabel(e.place)} ${gamePair(e)}`).join('; '),
      ],
      [
        'Та же пара уже стоит',
        counts.same,
        lists.same,
        (f) => `${fileName(f)} → ${gamePair(f)}`,
      ],
      [
        'Негодные элементы',
        report.items.invalid,
        lists.invalid,
        (e) =>
          `${e.item && typeof e.item === 'object' ? fileName(e.item) : e.item}: ` +
          e.reasons.join('; '),
      ],
      [
        'Один файл с разными парами в запросе',
        report.items.ambiguous,
        lists.ambiguous,
        (f) => `${fileName(f)}: ${f.pairs.map(gamePair).join('; ')}`,
      ],
    ])
  );
};

const describeKeys = (keys, counts) =>
  keys
    .map((key) => `${key} null ${counts[key].null}, не null ${counts[key].notNull}`)
    .join('; ');

const describeRemoved = (keys, removed) =>
  keys.map((key) => `${key} ${removed[key]}`).join(', ');

const describeDeadKeys = (report) => {
  const { keys, totals, byType } = report;
  const apply = report.mode === 'apply';
  const lines = [
    `Мёртвые ключи ${keys.join(' / ')} в metadata файлов media — ` +
      (apply ? 'снятие' : 'отчёт'),
    `Опись: записей ${totals.records.total}; ${describeKeys(keys, totals.records)}`,
    `GridFS: файлов ${totals.files.total}; ${describeKeys(keys, totals.files)}`,
  ];
  for (const entry of byType) {
    if (entry.records.total || entry.files.total) {
      lines.push(
        `  ${entry.type}: опись ${entry.records.total} ` +
          `(${describeKeys(keys, entry.records)}); ` +
          `GridFS ${entry.files.total} (${describeKeys(keys, entry.files)})`
      );
    }
  }
  if (totals.removed) {
    lines.push(
      'Снято (только null; счётчики выше — до снятия): ' +
        `опись — ${describeRemoved(keys, totals.removed.records)}; ` +
        `GridFS — ${describeRemoved(keys, totals.removed.files)}`
    );
  }

  const notNullTotal = keys.reduce(
    (sum, key) => sum + totals.records[key].notNull + totals.files[key].notNull,
    0
  );
  const notNull = byType.flatMap((entry) =>
    entry.notNull.map((row) => ({ ...row, type: entry.type }))
  );
  const names = (side) =>
    byType.flatMap((entry) =>
      entry[side].names.map((filename) => ({ type: entry.type, filename }))
    );
  const title = apply ? 'Не тронуто и почему:' : 'Снятие не тронет и почему:';
  return lines.concat(
    untouchedBlock(title, [
      [
        'Непустые значения — снимается только null, разобрать вручную',
        notNullTotal,
        notNull,
        (row) =>
          `${fileName(row)} (${placeLabel(row.place)}): ${row.key} = ${row.value}`,
      ],
      [
        'Записи описи без файла — только в отчёт',
        totals.recordsWithoutFile,
        names('recordsWithoutFile'),
        fileName,
      ],
      [
        'Файлы GridFS без записи — только в отчёт',
        totals.filesWithoutRecord,
        names('filesWithoutRecord'),
        fileName,
      ],
    ])
  );
};

const describeRevert = (report) => {
  const { reverted } = report;
  const perType = MEDIA_TYPES.filter(
    (type) => reverted.byType[type] && (reverted.byType[type].records || reverted.byType[type].files)
  ).map((type) => `${type} ${reverted.byType[type].records} / ${reverted.byType[type].files}`);
  return [
    `Откат игры файлов media: ${report.gameId ? `игра ${report.gameId}` : 'все игры'}`,
    `Снята пара и метка прохода: ${places(reverted)}` +
      (perType.length ? ` (${perType.join(', ')})` : ''),
    `Осталось с меткой прохода: ${places(report.marked)}`,
    'Не тронуто и почему:',
    '  Пары без метки прохода — их поставил не проход (токен загрузки или прежние записи)',
  ];
};

const deadKeys = (mode) => async () => [
  true,
  describeDeadKeys(await postToMedia(DEAD_KEYS_PATH, { mode })),
];

const projection = (fields) =>
  Object.fromEntries(fields.map(([field]) => [field, 1]));

const loadGames = () =>
  Game.find().select({ hash: 1, ...projection(GAME_FIELDS) }).lean();

const loadTurns = () =>
  Turn.find().select({ gameId: 1, ...projection(TURN_FIELDS) }).lean();

const gameBackfill = (mode) => async ({ hosts, gameId } = {}) => {
  const hostList = parseHosts(hosts);
  const scopeId = normalizeGameId(gameId);
  let scopeGame = null;
  if (scopeId) {
    scopeGame = await Game.findById(scopeId).select({ hash: 1 }).lean();
    if (!scopeGame) {
      throw new Error(`Игра ${scopeId} не найдена`);
    }
  }
  const [games, turns] = await Promise.all([loadGames(), loadTurns()]);
  const collected = collectFileItems({
    games,
    turns,
    hosts: hostList,
    gameId: scopeId,
  });
  const report = await sendItems(mode, collected.items, scopeId);
  return [
    true,
    describeGameBackfill({
      hosts: hostList,
      gameId: scopeId,
      gameHash: scopeGame && scopeGame.hash,
      gamesCount: games.length,
      turnsCount: turns.length,
      collected,
      report,
    }),
  ];
};

const revertGameBackfill = async ({ gameId } = {}) => {
  const scopeId = normalizeGameId(gameId);
  const report = await postToMedia(BACKFILL_PATH, {
    mode: 'revert',
    ...(scopeId ? { gameId: scopeId } : {}),
  });
  return [true, describeRevert(report)];
};

module.exports = {
  parseHosts,
  normalizeGameId,
  collectFileItems,
  mergeBackfillReports,
  describeGameBackfill,
  describeDeadKeys,
  describeRevert,
  checkDeadKeys: deadKeys('report'),
  removeDeadKeys: deadKeys('apply'),
  checkGameBackfill: gameBackfill('report'),
  runGameBackfill: gameBackfill('apply'),
  revertGameBackfill,
};
