const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log('Usage: node createAdmin.js username password');
    process.exit();
  }

  const hash = await bcrypt.hash(password, 10);

  await db.query(
    'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
    [username, hash]
  );

  console.log('Admin created successfully');
  process.exit();
}

createAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});