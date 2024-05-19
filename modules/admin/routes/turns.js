const router = require('express').Router();

const { list } = require('../controllers/Turn');

router.get('/', list);

module.exports = router;