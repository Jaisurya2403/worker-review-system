// ============================================================
// server.js - Main entry point for the backend server
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Middleware
// ============================================================

// Allow requests from your frontend origin
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',      // VS Code Live Server default
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
// Accessible at: http://localhost:5000/uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend files (for production deployment)
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// API Routes
// ============================================================
const adminRoutes = require('./routes/adminRoutes');
const storeRoutes = require('./routes/storeRoutes');
const publicRoutes = require('./routes/publicRoutes');

app.use('/api/admin', adminRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/public', publicRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Worker Review System API is running!' });
});

// Serve frontend pages for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'API route not found.' });
  }
});

// ============================================================
// Global error handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Worker Review System Backend Started!');
  console.log(`   Server running at: http://localhost:${PORT}`);
  console.log(`   API Health check:  http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📋 Quick Reference:');
  console.log('   Admin login:     POST /api/admin/login');
  console.log('   Store login:     POST /api/store/login');
  console.log('   Customer review: GET  /api/public/store/:slug');
  console.log('');
});

module.exports = app;
