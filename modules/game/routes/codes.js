const router = require('express').Router();

const { RULE_GAME_EDIT, RULE_VIEW } = require('../../../config/game/user');
const {
  addCode,
  codeLogin,
  updateViewport,
  refreshCode,
} = require('../controllers/Code');
const { rulesEndpoint, gameMiddleware } = require('../middlewares/games');

router.post('/login', codeLogin);
router.post('/add', gameMiddleware, rulesEndpoint(RULE_GAME_EDIT), addCode);
router.post('/refresh', gameMiddleware, rulesEndpoint(RULE_VIEW), refreshCode);
router.put(
  '/viewport',
  gameMiddleware,
  rulesEndpoint(RULE_VIEW),
  updateViewport
);

module.exports = router;
