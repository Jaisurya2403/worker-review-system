// ============================================================
// seedAdmin.js - Creates the default admin account
// Run: node database/seedAdmin.js
// ============================================================

const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('../config/db');

async function seedAdmin() {
  try {
    const username = 'admin';
    const password = 'Admin@123';

    // Check if admin already exists
    const [existing] = await db.query('SELECT id FROM admins WHERE username = ?', [username]);
    if (existing.length > 0) {
      console.log('ℹ️  Admin already exists. Skipping seed.');
      console.log('   Username: admin');
      console.log('   Password: Admin@123');
      process.exit(0);
    }

    // Hash password and insert admin
    const passwordHash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, passwordHash]);

    console.log('✅ Admin account created successfully!');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log('   ⚠️  Change this password after first login!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    process.exit(1);
  }
}

seedAdmin();
