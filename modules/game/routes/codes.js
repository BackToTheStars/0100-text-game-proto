const router = require('express').Router();

const { RULE_GAME_EDIT, RULE_VIEW } = require('../../../config/game/user');
const { addCode, codeLogin, updateViewport } = require('../controllers/Code');
const { rulesEndpoint, gameMiddleware } = require('../middlewares/games');

router.post('/login', codeLogin);
router.post('/add', gameMiddleware, rulesEndpoint(RULE_GAME_EDIT), addCode);
router.put(
  '/viewport',
  gameMiddleware,
  rulesEndpoint(RULE_VIEW),
  updateViewport
);

module.exports = router;
