const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const telemetryController = require('../controllers/telemetryController');

// POST /api/telemetry (multipart/form-data: fields + image)
router.post('/', upload.single('image'), telemetryController.receiveTelemetry);

// GET /api/telemetry (fetches current telemetry state)
router.get('/', telemetryController.getTelemetry);

module.exports = router;
