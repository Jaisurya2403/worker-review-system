const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { verifyStore } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route (no auth needed)
router.post('/login', storeController.login);

// Protected routes (store token + active subscription required)
router.get('/dashboard', verifyStore, checkSubscription, storeController.getDashboard);

// Worker management
router.post('/workers', verifyStore, checkSubscription, upload.single('image'), storeController.addWorker);
router.get('/workers', verifyStore, checkSubscription, storeController.getWorkers);
router.put('/workers/:id', verifyStore, checkSubscription, upload.single('image'), storeController.updateWorker);
router.delete('/workers/:id', verifyStore, checkSubscription, storeController.deleteWorker);

// Reviews
router.get('/reviews', verifyStore, checkSubscription, storeController.getReviews);
router.get('/reviews/stats', verifyStore, checkSubscription, storeController.getReviewStats);

module.exports = router;
