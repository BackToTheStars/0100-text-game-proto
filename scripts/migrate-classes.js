const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

require('../models/db');
const GameClass = require('../models/GameClass');
const GameClassOld = require('../models/GameClassOld');
const Game = require('../models/Game');

const getNameAlias = (title) => title.toLowerCase().replace(/\s/g, '-');

const start = async () => {
  await GameClass.deleteMany();
  const games = await Game.find();

  for (let game of games) {
    const classesOld = await GameClassOld.find({ gameId: game._id });
    console.log(classesOld.length);

    // пройтись по всем записями из classes
    let nextId = 1;
    for (let classOld of classesOld) {
      const gameClass = new GameClass({
        gameId: classOld.gameId,
        title: classOld.gameClass,
        name: getNameAlias(classOld.gameClass),
        id: nextId++,
      });

      // создать новую запись в classes-001
      await gameClass.save();

      // пройтись по всем subClasses
      for (let subClassOld of classOld.subClasses) {
        // создать новую запись в classes-001
        // с использованием parentId
        const subclass = new GameClass({
          gameId: classOld.gameId,
          title: subClassOld,
          name: getNameAlias(subClassOld),
          id: nextId++,
          parentId: gameClass.id,
        });
        await subclass.save();
      }
    }
  }

  process.exit();
};

setTimeout(() => {
  start();
}, 3000);
