const mysql = require("mysql2/promise");

// Create a pool instead of a single connection for better performance/reliability
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "meta_messenger",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00' // Force UTC to avoid local time conversion issues
});

module.exports = pool;
