const express = require('express');
const authRoutes = require('./auth');
const callRoutes = require('./calls');

const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount call routes
router.use('/calls', callRoutes);

module.exports = router;
