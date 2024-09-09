const router = require('express').Router();

const { list } = require('../controllers/Log');

router.get('/', list);

module.exports = router;
