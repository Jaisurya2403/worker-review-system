const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function run() {

  const adminHash = await bcrypt.hash("Admin@123", 10);
  const jaiHash = await bcrypt.hash("Jai@123", 10);

  await db.query(
    "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
    ["admins", adminHash]
  );

  await db.query(
    "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
    ["jais", jaiHash]
  );

  console.log("Admins created");
  console.log("admins / Admin@123");
  console.log("jais / Jai@123");

  process.exit();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});