const router = require('express').Router();

const { list } = require('../controllers/Game');

router.get('/', list);

module.exports = router;