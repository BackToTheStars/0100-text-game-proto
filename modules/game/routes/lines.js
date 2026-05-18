const { RULE_TURNS_CRUD } = require('../../../config/game/user');
const { rulesEndpoint } = require('../middlewares/games');

const { createLine, deleteLines } = require('../controllers/Line');

const router = require('express').Router();

router.post('/', rulesEndpoint(RULE_TURNS_CRUD), createLine);
router.delete('/', rulesEndpoint(RULE_TURNS_CRUD), deleteLines);

module.exports = router;
