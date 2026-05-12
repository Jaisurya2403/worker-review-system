const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function resetAdmin() {
  const hash = await bcrypt.hash("Admin@123", 10);

  await db.query("DELETE FROM admins WHERE username = ?", ["admin"]);

  await db.query(
    "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
    ["admin", hash]
  );

  console.log("Admin reset done");
  console.log("Username: admin");
  console.log("Password: Admin@123");
  process.exit();
}

resetAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});