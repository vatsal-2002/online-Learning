const express = require('express');
const router = express.Router();
const signUp = require('../controllers/signup');
const authMiddleware = require('../middleware/auth');

router.post('/signup', signUp.signUp);

module.exports = router;
