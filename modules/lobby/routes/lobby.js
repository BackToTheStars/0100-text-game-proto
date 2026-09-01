const cors = require('cors');
const router = require('express').Router();

const { gameMiddleware } = require('../../game/middlewares/games');
const {
  getTurns,
  getGames,
  getGamesByHashes,
  checkGame,
} = require('../controllers/LobbyController');

// Три ручки ниже анонимны — токена не требуют — и читаются с чужих origin'ов:
// веб-лобби агрегирует подписки, опрашивая несколько сайтов подряд (почему так —
// в lobby-split.md, документация лежит в brain-platform). CORS им открыт всегда,
// даже когда глобальный сужен списком origin'ов (config/cors.js). /check-game
// сюда не входит: он ходит с game-token и публичным не является.
const publicCors = cors();

router.get('/turns', publicCors, getTurns);
router.get('/games', publicCors, getGames);
router.get('/games-by-hashes', publicCors, getGamesByHashes);
router.get('/check-game', gameMiddleware, checkGame); // @todo: remove

module.exports = router;
