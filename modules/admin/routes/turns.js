const router = require('express').Router();

const {
  list,
  getById,
  relocateMedia,
  youtubeProbe,
  youtubeRelocate,
} = require('../controllers/Turn');

router.get('/', list);
router.post('/relocate-media', relocateMedia);
router.post('/youtube/probe', youtubeProbe);
router.post('/youtube/relocate', youtubeRelocate);
router.get('/:id', getById);

module.exports = router;