// ============================================================
// adminController.js - All admin-related business logic
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// POST /api/admin/login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const admin = rows[0];

if (username !== 'admin' || password !== '#jai242006') {
  return res.status(401).json({ error: 'Invalid username or password.' });
}

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Login successful', token, username: admin.username });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

// POST /api/admin/stores - Create a new store with owner credentials
async function createStore(req, res) {
  try {
    const { store_name, store_address, owner_username, owner_password } = req.body;

    if (!store_name || !owner_username || !owner_password) {
      return res.status(400).json({ error: 'Store name, owner username, and password are required.' });
    }

    if (owner_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if username already exists
    const [existingUser] = await db.query('SELECT id FROM store_users WHERE username = ?', [owner_username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists. Choose a different username.' });
    }

    // Generate unique QR slug from store name
    const baseSlug = store_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30);
    const qrSlug = baseSlug + '-' + Date.now().toString().slice(-5);

    // Insert store
    const [storeResult] = await db.query(
      'INSERT INTO stores (store_name, store_address, qr_slug) VALUES (?, ?, ?)',
      [store_name, store_address || '', qrSlug]
    );
    const storeId = storeResult.insertId;

    // Generate QR code image
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const qrUrl = `${baseUrl}/customer-review.html?store=${qrSlug}`;
    const qrDir = path.join(__dirname, '../uploads/qrcodes');
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
    const qrPath = path.join(qrDir, `store-${storeId}.png`);
    await QRCode.toFile(qrPath, qrUrl, { width: 300 });
    const qrCodePath = `uploads/qrcodes/store-${storeId}.png`;

    // Update store with QR code path
    await db.query('UPDATE stores SET qr_code_path = ? WHERE id = ?', [qrCodePath, storeId]);

    // Hash password and create store user
    const passwordHash = await bcrypt.hash(owner_password, 10);
    await db.query(
      'INSERT INTO store_users (store_id, username, password_hash) VALUES (?, ?, ?)',
      [storeId, owner_username, passwordHash]
    );

    res.status(201).json({
      message: 'Store created successfully!',
      store: { id: storeId, store_name, qr_slug: qrSlug, qr_url: qrUrl, qr_code_path: qrCodePath },
      owner: { username: owner_username }
    });
  } catch (err) {
    console.error('Create store error:', err);
    res.status(500).json({ error: 'Server error creating store.' });
  }
}

// GET /api/admin/stores - Get all stores with review counts
async function getStores(req, res) {
  try {
    const [stores] = await db.query(`
      SELECT 
        s.id, s.store_name, s.store_address, s.qr_slug, s.subscription_status, s.qr_code_path, s.created_at,
        su.username as owner_username,
        COUNT(DISTINCT w.id) as worker_count,
        COUNT(DISTINCT r.id) as review_count
      FROM stores s
      LEFT JOIN store_users su ON su.store_id = s.id
      LEFT JOIN workers w ON w.store_id = s.id AND w.status = 'active'
      LEFT JOIN reviews r ON r.store_id = s.id
      GROUP BY s.id, su.username
      ORDER BY s.created_at DESC
    `);

    res.json({ stores });
  } catch (err) {
    console.error('Get stores error:', err);
    res.status(500).json({ error: 'Server error fetching stores.' });
  }
}

// PUT /api/admin/stores/:id/status - Enable or disable a store
async function updateStoreStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "disabled".' });
    }

    const [result] = await db.query('UPDATE stores SET subscription_status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    res.json({ message: `Store ${status === 'active' ? 'enabled' : 'disabled'} successfully.` });
  } catch (err) {
    console.error('Update store status error:', err);
    res.status(500).json({ error: 'Server error updating store status.' });
  }
}

// DELETE /api/admin/stores/:id - Delete a store
async function deleteStore(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM stores WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Store not found.' });
    }
    res.json({ message: 'Store deleted successfully.' });
  } catch (err) {
    console.error('Delete store error:', err);
    res.status(500).json({ error: 'Server error deleting store.' });
  }
}

// GET /api/admin/stats - Overall platform statistics
async function getStats(req, res) {
  try {
    const [[{ total_stores }]] = await db.query('SELECT COUNT(*) as total_stores FROM stores');
    const [[{ active_stores }]] = await db.query("SELECT COUNT(*) as active_stores FROM stores WHERE subscription_status = 'active'");
    const [[{ total_reviews }]] = await db.query('SELECT COUNT(*) as total_reviews FROM reviews');
    const [[{ good_reviews }]] = await db.query("SELECT COUNT(*) as good_reviews FROM reviews WHERE review_type = 'good'");
    const [[{ bad_reviews }]] = await db.query("SELECT COUNT(*) as bad_reviews FROM reviews WHERE review_type = 'bad'");
    const [[{ total_workers }]] = await db.query("SELECT COUNT(*) as total_workers FROM workers WHERE status = 'active'");

    res.json({
      total_stores,
      active_stores,
      disabled_stores: total_stores - active_stores,
      total_reviews,
      good_reviews,
      bad_reviews,
      total_workers
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
}

// GET /api/admin/reviews - Get all reviews across all stores
async function getAllReviews(req, res) {
  try {
    const { store_id, review_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (store_id) {
      whereClause += ' AND r.store_id = ?';
      params.push(store_id);
    }
    if (review_type && ['good', 'bad'].includes(review_type)) {
      whereClause += ' AND r.review_type = ?';
      params.push(review_type);
    }

    const [reviews] = await db.query(`
      SELECT 
        r.id, r.rating, r.review_type, r.description, r.created_at,
        w.worker_name, w.role,
        s.store_name
      FROM reviews r
      JOIN workers w ON r.worker_id = w.id
      JOIN stores s ON r.store_id = s.id
      WHERE 1=1 ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM reviews r WHERE 1=1 ${whereClause}`,
      params
    );

    res.json({ reviews, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get all reviews error:', err);
    res.status(500).json({ error: 'Server error fetching reviews.' });
  }
}

// DELETE /api/admin/reviews/:id - Delete a review (moderation)
async function deleteReview(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Server error deleting review.' });
  }
}

module.exports = { login, createStore, getStores, updateStoreStatus, deleteStore, getStats, getAllReviews, deleteReview };
