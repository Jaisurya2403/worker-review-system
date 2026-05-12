// ============================================================
// subscriptionMiddleware.js - Checks if store subscription is active
// ============================================================

const db = require('../config/db');

async function checkSubscription(req, res, next) {
  try {
    const storeId = req.user.storeId;
    const [rows] = await db.query(
      'SELECT subscription_status FROM stores WHERE id = ?',
      [storeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    if (rows[0].subscription_status === 'disabled') {
      return res.status(403).json({
        error: 'subscription_expired',
        message: 'Your subscription has expired. Please contact the application admin.'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server error checking subscription.' });
  }
}

module.exports = { checkSubscription };
