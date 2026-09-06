const express = require('express');
const { register, login, getProfile, logout } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/me', authenticate, getProfile);
router.post('/logout', authenticate, logout);

module.exports = router;
