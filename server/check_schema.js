const pool = require('./src/config/database');

async function checkSchema() {
    try {
        const [convCols] = await pool.query('DESCRIBE conversations');
        console.log('--- Conversations Table ---');
        console.log(JSON.stringify(convCols, null, 2));

        const [msgCols] = await pool.query('DESCRIBE messages');
        console.log('--- Messages Table ---');
        console.log(JSON.stringify(msgCols, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
