const router = require('express').Router();

const { gameMiddleware } = require('../../game/middlewares/games');
const {
  getTurns,
  getGames,
  getGamesByHashes,
  checkGame,
} = require('../controllers/Lobby');

router.get('/turns', getTurns);
router.get('/games', getGames);
router.get('/games-by-hashes', getGamesByHashes);
router.get('/check-game', gameMiddleware, checkGame); // @todo: remove

module.exports = router;
