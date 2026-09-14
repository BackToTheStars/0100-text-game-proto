const router = require('express').Router();

const { getStats, getFiles, getLimits } = require('../controllers/Media');

router.get('/stats', getStats);
router.get('/files', getFiles);
router.get('/limits', getLimits);

module.exports = router;
