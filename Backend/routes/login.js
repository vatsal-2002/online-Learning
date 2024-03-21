const express = require('express');
const router = express.Router();
const Login = require('../controllers/login');
const authMiddleware = require('../middleware/auth');

router.post('/login', Login.login);

module.exports = router;
