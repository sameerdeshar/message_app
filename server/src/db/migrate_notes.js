require("dotenv").config();
const mysql = require("mysql2/promise");

const migrate = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Dropping existing user_notes table (to fix collation)...");
        await connection.query("DROP TABLE IF EXISTS user_notes");

        console.log("Creating user_notes table with utf8mb4_0900_ai_ci...");
        await connection.query(`
            CREATE TABLE user_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
                content TEXT COLLATE utf8mb4_0900_ai_ci NOT NULL,
                last_edited_by INT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_customer_note (customer_id),
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `);

        console.log("✅ user_notes table created successfully with foreign keys.");

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
