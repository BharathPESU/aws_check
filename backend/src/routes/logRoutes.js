const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// GET /api/logs?limit=N
router.get('/', logController.getLogs);

module.exports = router;
