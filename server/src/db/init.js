require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const initDb = async () => {
    try {
        // 1. Connect without Database to check/create it
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        console.log(`✅ Database ${process.env.DB_NAME} checked/created.`);
        await connection.end();

        // 2. Connect with Database to create tables
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true // Required for running schema.sql
        });

        const schemaPath = path.join(__dirname, "schema.sql");
        const schema = fs.readFileSync(schemaPath, "utf8");

        await pool.query(schema);
        console.log("✅ Tables created successfully.");

        // 3. Create Default Admin if not exists
        const [rows] = await pool.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await pool.query(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                ["admin", hashedPassword, "admin"]
            );
            console.log("✅ Default Admin created (User: admin, Pass: admin123)");
        }

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error("❌ Database initialization failed:", err);
        process.exit(1);
    }
};

initDb();
