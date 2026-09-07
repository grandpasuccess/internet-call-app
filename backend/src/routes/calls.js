const express = require('express');
const callController = require('../controllers/callController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// All call routes require authentication
router.get('/active', authenticate, callController.getActiveCalls);
router.get('/history', authenticate, callController.getCallHistory);

module.exports = router;
