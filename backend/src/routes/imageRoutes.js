const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// GET /api/images/latest
router.get('/latest', imageController.getLatestImage);

// GET /api/images
router.get('/', imageController.getImages);

module.exports = router;
