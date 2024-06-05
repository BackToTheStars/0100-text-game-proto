const router = require('express').Router();

const { getTurns, getGames } = require('../controllers/Lobby');

router.get('/turns', getTurns);
router.get('/games', getGames);

module.exports = router;