const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const callController = require('../controllers/callController');

const router = express.Router();

// All call routes require authentication
router.use(authenticate);

// GET /api/calls/active - active calls for user
router.get('/active', callController.getActiveCalls);

// GET /api/calls/history - call history with optional limit
router.get('/history', callController.getCallHistory);

// GET /api/calls/:id - specific call details
router.get('/:id', callController.getCall);

module.exports = router;
