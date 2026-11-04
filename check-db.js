
const { loadEnvConfig } = require("@next/env");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

loadEnvConfig(process.cwd());

async function fixOfficerPassword() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const password = "Officer@123";
  const hash = await bcrypt.hash(password, 10);

  await db.execute(
    "UPDATE users SET password_hash = ? WHERE email = ?",
    [hash, "officer@example.com"]
  );

  const [rows] = await db.execute(
    "SELECT password_hash FROM users WHERE email = ?",
    ["officer@example.com"]
  );

  const matches = await bcrypt.compare(password, rows[0].password_hash);

  console.log("PASSWORD UPDATED:", matches);

  await db.end();
}

fixOfficerPassword().catch(console.error);
