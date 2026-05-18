const router = require('express').Router();

const { list, getById, moveAudio } = require('../controllers/Turn');

router.get('/', list);
router.post('/move-audio', moveAudio);
router.get('/:id', getById);

module.exports = router;