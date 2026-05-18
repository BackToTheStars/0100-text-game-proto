const router = require('express').Router();

const { login } = require('../controllers/Auth');

router.post('/login', login);

module.exports = router;
