// routes/auth.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.get('/me', ctrl.me);
router.put('/password', ctrl.changePassword);

module.exports = router;
