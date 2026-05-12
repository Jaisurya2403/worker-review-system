// ============================================================
// storeController.js - All store owner business logic
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// POST /api/store/login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [rows] = await db.query(
      'SELECT su.*, s.subscription_status, s.store_name FROM store_users su JOIN stores s ON su.store_id = s.id WHERE su.username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Check subscription before allowing login
    if (user.subscription_status === 'disabled') {
      return res.status(403).json({
        error: 'subscription_expired',
        message: 'Your subscription has expired. Please contact the application admin.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, storeId: user.store_id, role: 'store' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Login successful', token, username: user.username, store_name: user.store_name, store_id: user.store_id });
  } catch (err) {
    console.error('Store login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

// GET /api/store/dashboard
async function getDashboard(req, res) {
  try {
    const storeId = req.user.storeId;

    // Get store info
    const [[store]] = await db.query('SELECT * FROM stores WHERE id = ?', [storeId]);

    // Overall review stats
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        SUM(CASE WHEN review_type = 'good' THEN 1 ELSE 0 END) as good_reviews,
        SUM(CASE WHEN review_type = 'bad' THEN 1 ELSE 0 END) as bad_reviews,
        ROUND(AVG(rating), 1) as avg_rating
      FROM reviews WHERE store_id = ?
    `, [storeId]);

    // Worker performance
    const [workerStats] = await db.query(`
      SELECT 
        w.id, w.worker_name, w.role, w.image_path,
        COUNT(r.id) as total_reviews,
        SUM(CASE WHEN r.review_type = 'good' THEN 1 ELSE 0 END) as good_reviews,
        SUM(CASE WHEN r.review_type = 'bad' THEN 1 ELSE 0 END) as bad_reviews,
        ROUND(AVG(r.rating), 1) as avg_rating
      FROM workers w
      LEFT JOIN reviews r ON r.worker_id = w.id
      WHERE w.store_id = ? AND w.status = 'active'
      GROUP BY w.id
      ORDER BY good_reviews DESC
    `, [storeId]);

    // Best and worst worker
    const bestWorker = workerStats.length > 0 ? workerStats[0] : null;
    const workerNeedsImprovement = workerStats.length > 0
      ? [...workerStats].sort((a, b) => (b.bad_reviews || 0) - (a.bad_reviews || 0))[0]
      : null;

    // Monthly trend (last 6 months)
    const [monthlyTrend] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN review_type = 'good' THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN review_type = 'bad' THEN 1 ELSE 0 END) as bad
      FROM reviews
      WHERE store_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `, [storeId]);

    res.json({
      store,
      stats,
      worker_stats: workerStats,
      best_worker: bestWorker,
      worker_needs_improvement: workerNeedsImprovement,
      monthly_trend: monthlyTrend
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error fetching dashboard.' });
  }
}

// POST /api/store/workers - Add a new worker
async function addWorker(req, res) {
  try {
    const storeId = req.user.storeId;
    const { worker_name, role } = req.body;

    if (!worker_name) {
      // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Worker name is required.' });
    }

    const imagePath = req.file ? `uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      'INSERT INTO workers (store_id, worker_name, role, image_path) VALUES (?, ?, ?, ?)',
      [storeId, worker_name, role || '', imagePath]
    );

    res.status(201).json({
      message: 'Worker added successfully!',
      worker: { id: result.insertId, worker_name, role, image_path: imagePath }
    });
  } catch (err) {
    console.error('Add worker error:', err);
    res.status(500).json({ error: 'Server error adding worker.' });
  }
}

// GET /api/store/workers
async function getWorkers(req, res) {
  try {
    const storeId = req.user.storeId;
    const [workers] = await db.query(
      "SELECT * FROM workers WHERE store_id = ? ORDER BY created_at DESC",
      [storeId]
    );
    res.json({ workers });
  } catch (err) {
    console.error('Get workers error:', err);
    res.status(500).json({ error: 'Server error fetching workers.' });
  }
}

// PUT /api/store/workers/:id - Edit a worker
async function updateWorker(req, res) {
  try {
    const storeId = req.user.storeId;
    const { id } = req.params;
    const { worker_name, role, status } = req.body;

    // Verify this worker belongs to this store
    const [check] = await db.query('SELECT * FROM workers WHERE id = ? AND store_id = ?', [id, storeId]);
    if (check.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Worker not found.' });
    }

    let imagePath = check[0].image_path;
    if (req.file) {
      // Delete old image if exists
      if (imagePath) {
        const oldPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imagePath = `uploads/${req.file.filename}`;
    }

    await db.query(
      'UPDATE workers SET worker_name = ?, role = ?, image_path = ?, status = ? WHERE id = ? AND store_id = ?',
      [worker_name || check[0].worker_name, role || check[0].role, imagePath, status || check[0].status, id, storeId]
    );

    res.json({ message: 'Worker updated successfully.' });
  } catch (err) {
    console.error('Update worker error:', err);
    res.status(500).json({ error: 'Server error updating worker.' });
  }
}

// DELETE /api/store/workers/:id - Deactivate (soft delete) a worker
async function deleteWorker(req, res) {
  try {
    const storeId = req.user.storeId;
    const { id } = req.params;

    const [check] = await db.query('SELECT id FROM workers WHERE id = ? AND store_id = ?', [id, storeId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    // Soft delete by setting status to inactive
    await db.query("UPDATE workers SET status = 'inactive' WHERE id = ? AND store_id = ?", [id, storeId]);
    res.json({ message: 'Worker deactivated successfully.' });
  } catch (err) {
    console.error('Delete worker error:', err);
    res.status(500).json({ error: 'Server error deactivating worker.' });
  }
}

// GET /api/store/reviews - Get reviews with optional filters
async function getReviews(req, res) {
  try {
    const storeId = req.user.storeId;
    const { worker_id, review_type, rating, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.store_id = ?';
    const params = [storeId];

    if (worker_id) { whereClause += ' AND r.worker_id = ?'; params.push(worker_id); }
    if (review_type && ['good', 'bad'].includes(review_type)) { whereClause += ' AND r.review_type = ?'; params.push(review_type); }
    if (rating) { whereClause += ' AND r.rating = ?'; params.push(parseInt(rating)); }
    if (date_from) { whereClause += ' AND DATE(r.created_at) >= ?'; params.push(date_from); }
    if (date_to) { whereClause += ' AND DATE(r.created_at) <= ?'; params.push(date_to); }

    const [reviews] = await db.query(`
      SELECT r.id, r.rating, r.review_type, r.description, r.created_at,
             w.worker_name, w.role, w.image_path
      FROM reviews r
      JOIN workers w ON r.worker_id = w.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM reviews r ${whereClause}`,
      params
    );

    res.json({ reviews, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Server error fetching reviews.' });
  }
}

// GET /api/store/reviews/stats
async function getReviewStats(req, res) {
  try {
    const storeId = req.user.storeId;

    const [[overall]] = await db.query(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN review_type = 'good' THEN 1 ELSE 0 END) as good,
             SUM(CASE WHEN review_type = 'bad' THEN 1 ELSE 0 END) as bad,
             ROUND(AVG(rating), 1) as avg_rating
      FROM reviews WHERE store_id = ?
    `, [storeId]);

    const [workerStats] = await db.query(`
      SELECT w.worker_name, COUNT(r.id) as total,
             SUM(CASE WHEN r.review_type = 'good' THEN 1 ELSE 0 END) as good,
             SUM(CASE WHEN r.review_type = 'bad' THEN 1 ELSE 0 END) as bad,
             ROUND(AVG(r.rating), 1) as avg_rating
      FROM workers w
      LEFT JOIN reviews r ON r.worker_id = w.id
      WHERE w.store_id = ? AND w.status = 'active'
      GROUP BY w.id, w.worker_name
    `, [storeId]);

    const [ratingDist] = await db.query(`
      SELECT rating, COUNT(*) as count FROM reviews WHERE store_id = ? GROUP BY rating ORDER BY rating
    `, [storeId]);

    res.json({ overall, worker_stats: workerStats, rating_distribution: ratingDist });
  } catch (err) {
    console.error('Get review stats error:', err);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
}

module.exports = { login, getDashboard, addWorker, getWorkers, updateWorker, deleteWorker, getReviews, getReviewStats };
