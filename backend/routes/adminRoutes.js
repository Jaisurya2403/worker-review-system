const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Public route (no auth needed)
router.post('/login', adminController.login);

// Protected routes (admin token required)
router.post('/stores', verifyAdmin, adminController.createStore);
router.get('/stores', verifyAdmin, adminController.getStores);
router.put('/stores/:id/status', verifyAdmin, adminController.updateStoreStatus);
router.delete('/stores/:id', verifyAdmin, adminController.deleteStore);
router.get('/stats', verifyAdmin, adminController.getStats);
router.get('/reviews', verifyAdmin, adminController.getAllReviews);
router.delete('/reviews/:id', verifyAdmin, adminController.deleteReview);

module.exports = router;
