const path = require('path');
require("dotenv").config({
    path: path.join(__dirname, '../../.env')
});

require("../models/db");
const GameClass = require("../models/GameClass");
const Turn = require("../models/Turn");
const GAME_ID = '5f7e843151be1669dc611045'; // 5f7e843151be1669dc611045

const fixFunc = async () => {
    // const gameClasses = await GameClass.find();
    // for(let gameClass of gameClasses) {
    //   if(gameClass.gameId) {
    //     console.log('game id exists')
    //   } else {
    //     gameClass.gameId = GAME_ID;
    //     console.log('saved game class', gameClass._id, gameClass.gameId);
    //     await gameClass.save();
    //   }
    // }

    //   const turns = await Turn.find();
    //   for(let turn of turns) {
    //     if(turn.gameId) {
    //       console.log('Game ID exists:', turn.id, turn.header)
    //     } else {
    //       turn.gameId = GAME_ID;
    //       console.log('Saved turn:', turn._id, turn.gameId);
    //       await turn.save();
    //     }
    //   }
    process.exit(1);
}

fixFunc();