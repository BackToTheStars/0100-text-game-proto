const router = require('express').Router();

const {
  list,
  run,
} = require('../controllers/Script');

router.get('/', list);
router.post('/', run);

module.exports = router;
