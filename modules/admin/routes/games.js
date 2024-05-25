const router = require('express').Router();

const { list, remove } = require('../controllers/Game');

router.get('/', list);
router.delete('/:id', remove);

module.exports = router;