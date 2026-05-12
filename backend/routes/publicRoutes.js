const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// All public routes - no authentication required
router.get('/store/:qrSlug', publicController.getStoreBySlug);
router.get('/store/:qrSlug/workers', publicController.getWorkers);
router.post('/store/:qrSlug/reviews', publicController.submitReview);

module.exports = router;
