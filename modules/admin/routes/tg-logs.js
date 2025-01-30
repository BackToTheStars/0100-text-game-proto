const router = require('express').Router();

const { getChatIds, getLogs } = require('../controllers/TgLog');

router.get('/', getLogs);
router.get('/chat-ids', getChatIds);

module.exports = router;
