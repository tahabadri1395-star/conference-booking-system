// routes/auth.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.get('/me', ctrl.me);

module.exports = router;
