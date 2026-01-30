require("dotenv").config();
const mysql = require("mysql2/promise");

const debug = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.query("SHOW FULL COLUMNS FROM customers");
        console.log("Customers Columns:", rows);

        const [rows2] = await connection.query("SHOW FULL COLUMNS FROM user_notes");
        console.log("UserNotes Columns:", rows2);

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ Debug failed:", err);
        process.exit(1);
    }
};

debug();
