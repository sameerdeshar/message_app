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

        console.log('🔗 Connected to database...');

        // Check if fcm_token already exists
        const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'fcm_token'`);

        if (columns.length === 0) {
            console.log('➕ Adding fcm_token column to users table...');
            await connection.query(`ALTER TABLE users ADD COLUMN fcm_token TEXT AFTER role`);
            console.log('✅ Column added successfully.');
        } else {
            console.log('ℹ️ fcm_token column already exists.');
        }

        await connection.end();
        console.log('🏁 Migration finished.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
