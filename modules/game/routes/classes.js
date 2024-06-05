const { RULE_TURNS_CRUD, RULE_VIEW } = require('../../../config/game/user');
const { rulesEndpoint } = require('../middlewares/games');

const {
  getGameClasses,
  getGameClass,
  createGameClass,
  updateGameClass,
  deleteGameClass,
} = require('../controllers/GameClass');

const router = require('express').Router();

router.get('/', rulesEndpoint(RULE_VIEW), getGameClasses);
router.get('/:id', rulesEndpoint(RULE_VIEW), getGameClass);
router.post('/', rulesEndpoint(RULE_TURNS_CRUD), createGameClass);
router.put('/:id', rulesEndpoint(RULE_TURNS_CRUD), updateGameClass);
router.delete('/:id', rulesEndpoint(RULE_TURNS_CRUD), deleteGameClass);

module.exports = router;
