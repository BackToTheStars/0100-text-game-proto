const router = require('express').Router();

const { RULE_VIEW, RULE_GAME_EDIT } = require('../../../config/game/user');
const { gameMiddleware, rulesEndpoint } = require('../middlewares/games');
const {
  getGame,
  createGame,
  editGame,
  deleteGame,
} = require('../controllers/Game');

router.post('/', createGame);
router.get('/', gameMiddleware, rulesEndpoint(RULE_VIEW), getGame);
router.put('/', gameMiddleware, rulesEndpoint(RULE_GAME_EDIT), editGame);
router.delete('/', gameMiddleware, rulesEndpoint(RULE_GAME_EDIT), deleteGame);

module.exports = router;
