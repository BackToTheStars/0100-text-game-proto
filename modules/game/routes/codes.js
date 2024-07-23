const router = require('express').Router();

const { RULE_GAME_EDIT, RULE_VIEW, RULE_TURNS_CRUD } = require('../../../config/game/user');
const {
  addCode,
  codeLogin,
  refreshCode,
  getStaticToken,
} = require('../controllers/Code');
const { rulesEndpoint, gameMiddleware } = require('../middlewares/games');

router.post('/login', codeLogin);
router.post('/add', gameMiddleware, rulesEndpoint(RULE_GAME_EDIT), addCode);
router.post('/refresh', gameMiddleware, rulesEndpoint(RULE_VIEW), refreshCode);
router.post('/static-token', gameMiddleware, rulesEndpoint(RULE_TURNS_CRUD), getStaticToken);

module.exports = router;
