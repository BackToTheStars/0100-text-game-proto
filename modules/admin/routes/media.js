const router = require('express').Router();

const { getStats } = require('../controllers/Media');

router.get('/stats', getStats);

module.exports = router;
