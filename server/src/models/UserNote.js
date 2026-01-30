const pool = require('../config/database');

/**
 * UserNote Model
 * Handles database operations for customer notes
 */
class UserNote {
    /**
     * Find note by customer ID
     * @param {string} customerId - Customer's Facebook PSID
     * @returns {Promise<Object|null>} Note object or null
     */
    static async findByCustomerId(customerId) {
        const [rows] = await pool.query(
            `SELECT un.*, u.username as last_editor_name 
             FROM user_notes un
             LEFT JOIN users u ON un.last_edited_by = u.id
             WHERE un.customer_id = ?`,
            [customerId]
        );
        return rows[0] || null;
    }

    /**
     * Create or update a note
     * @param {Object} noteData - {customerId, content, last_edited_by}
     * @returns {Promise<Object>} Updated note
     */
    static async upsert({ customerId, content, last_edited_by }) {
        await pool.query(
            `INSERT INTO user_notes (customer_id, content, last_edited_by) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
                content = VALUES(content), 
                last_edited_by = VALUES(last_edited_by),
                updated_at = CURRENT_TIMESTAMP`,
            [customerId, content, last_edited_by]
        );
        return await this.findByCustomerId(customerId);
    }

    /**
     * Delete a note
     * @param {string} customerId - Customer ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(customerId) {
        const [result] = await pool.query(
            'DELETE FROM user_notes WHERE customer_id = ?',
            [customerId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = UserNote;
