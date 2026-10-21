const router = require('express').Router();

const { gameMiddleware } = require('../../game/middlewares/games');
const {
  getTurns,
  getGames,
  getGamesByHashes,
  checkGame,
} = require('../controllers/LobbyController');

// Три ручки ниже анонимны — токена не требуют; /check-game ходит с game-token.
// CORS для всех ручек вне /admin* открыт глобально, см. config/cors.js.
router.get('/turns', getTurns);
router.get('/games', getGames);
router.get('/games-by-hashes', getGamesByHashes);
router.get('/check-game', gameMiddleware, checkGame); // @todo: remove

module.exports = router;
