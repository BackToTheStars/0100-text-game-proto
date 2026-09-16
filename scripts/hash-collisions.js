// Опись коллизий адресов игр и кодов доступа. Только чтение.
//
// Адрес игры — поле hash. У игр, созданных до поля, адрес вычислялся из _id;
// им его проставляет миграция в админке, и здесь такие игры считаются по
// вычисленному значению. Печатает: адреса, занятые больше одной игрой, коды,
// общие у разных игр, и коды, равные адресу чужой игры.
//
// Запуск: node ./scripts/hash-collisions.js   (MONGO_URL берётся из .env)

const { resolve } = require('path');
const mongoose = require('mongoose');
require('dotenv').config({
  path: resolve(__dirname, '../.env'),
});

const {
  legacyAddressFromId,
} = require('../modules/admin/services/scripts/GameAddress');

const isE2E = (name) => /^e2e-/.test(name || '');

const fmt = (game) =>
  `    ${game._id}  ${JSON.stringify(game.name || '')}  адрес: ${
    game.hash ? game.hash : `${legacyAddressFromId(game._id)} (вычислен, поля нет)`
  }  создана: ${
    game.createdAt ? new Date(game.createdAt).toISOString() : '—'
  }  public: ${game.public}`;

const main = async () => {
  if (!process.env.MONGO_URL) {
    console.error('MONGO_URL не задан (.env рядом с server/)');
    process.exit(1);
  }
  // Только чтение: индексов и коллекций на подключении не строить.
  await mongoose.connect(process.env.MONGO_URL, {
    autoIndex: false,
    autoCreate: false,
  });
  const db = mongoose.connection.db;
  console.log(`База: ${db.databaseName}\n`);

  const games = await db
    .collection('games')
    .find(
      {},
      { projection: { name: 1, createdAt: 1, public: 1, codes: 1, hash: 1 } }
    )
    .sort({ _id: 1 })
    .toArray();

  const addressOf = (game) => game.hash || legacyAddressFromId(game._id);
  const withoutField = games.filter((game) => !game.hash);

  // --- адреса игр -----------------------------------------------------------
  const byAddress = new Map();
  for (const game of games) {
    const address = addressOf(game);
    if (!byAddress.has(address)) {
      byAddress.set(address, []);
    }
    byAddress.get(address).push(game);
  }

  const collisions = [...byAddress.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  let involvedE2E = 0;
  let unreachable = 0;

  console.log('=== Адреса, занятые больше одной игры (не резолвятся ни в одну) ===');
  if (!collisions.length) {
    console.log('  нет');
  }
  for (const [address, list] of collisions) {
    console.log(`  ${address} — игр: ${list.length}`);
    for (const game of list) {
      console.log(fmt(game));
      unreachable++;
      if (isE2E(game.name)) {
        involvedE2E++;
      }
    }
  }

  // --- коды доступа ---------------------------------------------------------
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

  console.log('\n=== Коды доступа, общие у разных игр (вход по ним отказывает) ===');
  if (!codeCollisions.length) {
    console.log('  нет');
  }
  for (const [code, ids] of codeCollisions) {
    console.log(`  ${code} — игры: ${[...ids].join(', ')}`);
  }

  // Код посетителя публичной игры равен её же адресу — это не коллизия.
  const foreign = [];
  for (const game of games) {
    const own = addressOf(game);
    for (const code of game.codes || []) {
      if (!code.hash || code.hash === own) {
        continue;
      }
      const owners = (byAddress.get(code.hash) || []).filter(
        (other) => '' + other._id !== '' + game._id
      );
      for (const other of owners) {
        foreign.push(`  ${code.hash} — код игры ${game._id}, адрес игры ${other._id}`);
      }
    }
  }

  console.log('\n=== Коды, равные адресу чужой игры ===');
  if (!foreign.length) {
    console.log('  нет');
  }
  for (const line of foreign) {
    console.log(line);
  }

  // --- итог -----------------------------------------------------------------
  console.log('\n=== Итог ===');
  console.log(`  всего игр: ${games.length}`);
  console.log(`  с полем адреса: ${games.length - withoutField.length}`);
  console.log(`  без поля (ждут миграцию): ${withoutField.length}`);
  console.log(`  адресов занято дважды и более: ${collisions.length}`);
  console.log(`  игр недостижимо по своему адресу: ${unreachable}`);
  console.log(`  из них с именем e2e-*: ${involvedE2E}`);
  console.log(`  кодов доступа, общих у разных игр: ${codeCollisions.length}`);
  console.log(`  кодов, равных адресу чужой игры: ${foreign.length}`);

  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
