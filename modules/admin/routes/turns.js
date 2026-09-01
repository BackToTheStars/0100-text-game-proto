const router = require('express').Router();

const {
  list,
  getById,
  youtubeList,
  relocateMedia,
  youtubeProbe,
  youtubeRelocate,
} = require('../controllers/Turn');

router.get('/', list);
// Строго выше '/:id', иначе 'youtube-list' уедет в getById как id хода.
router.get('/youtube-list', youtubeList);
router.post('/relocate-media', relocateMedia);
router.post('/youtube/probe', youtubeProbe);
router.post('/youtube/relocate', youtubeRelocate);
router.get('/:id', getById);

module.exports = router;