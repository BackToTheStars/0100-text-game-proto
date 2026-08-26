const router = require('express').Router();

const { getStats, getFiles } = require('../controllers/Media');

router.get('/stats', getStats);
router.get('/files', getFiles);

module.exports = router;
