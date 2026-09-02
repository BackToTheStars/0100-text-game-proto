const router = require('express').Router();

const { gameMiddleware } = require('../../game/middlewares/games');
const {
  getTurns,
  getGames,
  getGamesByHashes,
  checkGame,
} = require('../controllers/LobbyController');

// Три ручки ниже анонимны — токена не требуют. Открытость для любого origin'а
// живёт теперь в config/cors.js (глобальный делегат), не здесь. /check-game
// сюда не входит: он ходит с game-token и публичным не является.
router.get('/turns', getTurns);
router.get('/games', getGames);
router.get('/games-by-hashes', getGamesByHashes);
router.get('/check-game', gameMiddleware, checkGame); // @todo: remove

module.exports = router;
