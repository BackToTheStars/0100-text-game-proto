const router = require('express').Router();

const { RULE_TURNS_CRUD } = require('../../../config/game/user');
const {
  getTurnsGeometry,
  getTurnsByIds,
  createTurn,
  updateCoordinates,
  updateTurn,
  deleteTurn,
} = require('../controllers/Turn');
const { rulesEndpoint } = require('../middlewares/games');

router.get('/geometry', getTurnsGeometry);
router.get('/ids', getTurnsByIds);
router.post('/', rulesEndpoint(RULE_TURNS_CRUD), createTurn);
router.put('/coordinates', rulesEndpoint(RULE_TURNS_CRUD), updateCoordinates);
router.put('/:id', rulesEndpoint(RULE_TURNS_CRUD), updateTurn);
router.delete('/:id', rulesEndpoint(RULE_TURNS_CRUD), deleteTurn);

module.exports = router;
