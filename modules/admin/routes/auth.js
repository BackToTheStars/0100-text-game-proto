const router = require('express').Router();

const { login } = require('../controllers/Auth');
const { createLoginRateLimit } = require('../../core/middlewares/rateLimit');

router.post('/login', createLoginRateLimit(), login);

module.exports = router;
