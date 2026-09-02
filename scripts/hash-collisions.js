// Опись коллизий адресов игр.
//
// Адрес игры (`?hash=`) — это последние три символа её `_id`, то есть на всю
// базу существует 4096 адресов. Когда две игры попадают в один адрес, ссылка
// ведёт только в одну из них, а вторая недостижима: именно так удаление по
// адресу однажды ушло в чужую игру. Скрипт считает, сколько таких адресов
// в базе, и печатает участников каждой группы, чтобы можно было решить, что
// с ними делать (переименовать, удалить, оставить недостижимой).
//
// Запуск: node ./scripts/hash-collisions.js   (MONGO_URL берётся из .env)

const { resolve } = require('path');
const mongoose = require('mongoose');
require('dotenv').config({
  path: resolve(__dirname, '../.env'),
});

const { hashFunc } = require('../modules/game/services/security');

const isE2E = (name) => /^e2e-/.test(name || '');

const fmt = (game) =>
  `    ${game._id}  ${JSON.stringify(game.name || '')}  создана: ${
    game.createdAt ? new Date(game.createdAt).toISOString() : '—'
  }  public: ${game.public}`;

const main = async () => {
  if (!process.env.MONGO_URL) {
    console.error('MONGO_URL не задан (.env рядом с server/)');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URL);
  const db = mongoose.connection.db;
  console.log(`База: ${db.databaseName}\n`);

  const games = await db
    .collection('games')
    .find({}, { projection: { name: 1, createdAt: 1, public: 1, codes: 1 } })
    .sort({ _id: 1 })
    .toArray();

  // --- адреса игр -----------------------------------------------------------
  const byHash = new Map();
  for (const game of games) {
    const hash = hashFunc(game._id);
    if (!byHash.has(hash)) {
      byHash.set(hash, []);
    }
    byHash.get(hash).push(game);
  }

  const collisions = [...byHash.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  let unreachable = 0;
  let unreachableE2E = 0;
  let involvedE2E = 0;

  console.log('=== Адреса игр, занятые больше одного раза ===');
  if (!collisions.length) {
    console.log('  нет');
  }
  for (const [hash, list] of collisions) {
    console.log(`  ${hash} — игр: ${list.length}`);
    for (const game of list) {
      console.log(fmt(game));
      if (isE2E(game.name)) {
        involvedE2E++;
      }
    }
    // Достижима по своему адресу только старшая по _id: словарь адресов
    // оставлял первое отображение. Остальные — недостижимы.
    for (const game of list.slice(1)) {
      unreachable++;
      if (isE2E(game.name)) {
        unreachableE2E++;
      }
    }
  }

  // --- хеши кодов доступа ---------------------------------------------------
  // Коды длиннее адреса игры, поэтому с адресами они не пересекаются, но код
  // одной игры может совпасть с кодом другой — такая ссылка тоже становится
  // неоднозначной.
  const byCode = new Map();
  for (const game of games) {
    for (const code of game.codes || []) {
      if (!code.hash) {
        continue;
      }
      if (!byCode.has(code.hash)) {
        byCode.set(code.hash, new Set());
      }
      byCode.get(code.hash).add('' + game._id);
    }
  }
  const codeCollisions = [...byCode.entries()].filter(([, ids]) => ids.size > 1);

  console.log('\n=== Коды доступа, общие у разных игр ===');
  if (!codeCollisions.length) {
    console.log('  нет');
  }
  for (const [hash, ids] of codeCollisions) {
    console.log(`  ${hash} — игры: ${[...ids].join(', ')}`);
  }

  // --- итог -----------------------------------------------------------------
  console.log('\n=== Итог ===');
  console.log(`  всего игр: ${games.length}`);
  console.log(`  занято адресов: ${byHash.size} из 4096`);
  console.log(`  адресов занято дважды и более: ${collisions.length}`);
  console.log(`  игр недостижимо по своему адресу: ${unreachable}`);
  console.log(
    `  из них с именем e2e-*: ${unreachableE2E} (всего участников коллизий с таким именем: ${involvedE2E})`
  );
  console.log(`  кодов доступа, общих у разных игр: ${codeCollisions.length}`);

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
