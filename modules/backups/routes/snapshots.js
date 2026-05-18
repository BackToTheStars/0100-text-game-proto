const router = require('express').Router();

const {
  list,
  createSnapshot,
} = require('../controllers/Snapshot');

router.get('/', list);
router.post('/', createSnapshot);

module.exports = router;
