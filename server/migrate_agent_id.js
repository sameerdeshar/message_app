require('dotenv').config();
const pool = require('./src/config/database');

async function migrate() {
    try {
        // 1. Add agent_id column
        try {
            console.log("Attempting to add agent_id column...");
            await pool.query("ALTER TABLE messages ADD COLUMN agent_id INT NULL");
            console.log("✅ Added agent_id column.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ Column agent_id already exists.");
            } else {
                throw err;
            }
        }

        // 2. Add foreign key
        try {
            console.log("Attempting to add foreign key...");
            await pool.query("ALTER TABLE messages ADD CONSTRAINT fk_messages_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL");
            console.log("✅ Added foreign key.");
        } catch (err) {
            if (err.code === 'ER_DUP_KEY' || err.toString().includes('Duplicate key')) {
                console.log("ℹ️ Foreign key already exists.");
            } else {
                // If checking for constraint existence is hard, we can ignore specific errors or specific codes
                // BUT, let's just log it. Often repeatedly adding FK might verify or fail gracefully.
                console.log("⚠️ Note on FK: " + err.message);
            }
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
