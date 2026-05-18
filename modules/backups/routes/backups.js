const router = require('express').Router();

const {
  list,
  create,
  restore,
  createAndRestore,
} = require('../controllers/Backup');

router.get('/', list);
router.post('/', create);
router.post('/restore', restore);
router.post('/create-and-restore', createAndRestore);

module.exports = router;



