const router = require('express').Router();

const {
  list,
  getById,
  moveAudio,
  relocateMedia,
} = require('../controllers/Turn');

router.get('/', list);
router.post('/move-audio', moveAudio);
router.post('/relocate-media', relocateMedia);
router.get('/:id', getById);

module.exports = router;