const pool = require('../config/database');

/**
 * User Model
 * Handles all database operations related to users
 */
class User {
    /**
     * Find user by ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    static async findById(userId) {
        const [rows] = await pool.query(
            'SELECT id, username, role, fcm_token, created_at FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    }

    /**
     * Find user by username
     * @param {string} username - Username
     * @returns {Promise<Object|null>} User object with password or null
     */
    static async findByUsername(username) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0] || null;
    }

    /**
     * Create a new user
     * @param {Object} userData - User data {username, password_hash, role}
     * @returns {Promise<Object>} Created user object
     */
    static async create({ username, password_hash, role = 'agent' }) {
        const [result] = await pool.query(
            'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)',
            [username, password_hash, role, new Date()]
        );
        return await this.findById(result.insertId);
    }

    /**
     * Get all users
     * @returns {Promise<Array>} Array of user objects
     */
    static async findAll() {
        const [rows] = await pool.query(
            'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
        );
        return rows;
    }

    /**
     * Update user
     * @param {number} userId - User ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated user object
     */
    static async update(userId, updates) {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        });

        values.push(userId);

        await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return await this.findById(userId);
    }

    /**
     * Delete user
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(userId) {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        return result.affectedRows > 0;
    }

    /**
     * Get pages assigned to user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of page objects
     */
    static async getAssignedPages(userId) {
        const [rows] = await pool.query(
            `SELECT p.* FROM pages p
       JOIN user_pages up ON p.id = up.page_id
       WHERE up.user_id = ?`,
            [userId]
        );
        return rows;
    }

    /**
     * Assign page to user
     * @param {number} userId - User ID
     * @param {number} pageId - Page ID
     * @returns {Promise<boolean>} Success status
     */
    static async assignPage(userId, pageId) {
        await pool.query(
            'INSERT INTO user_pages (user_id, page_id, assigned_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_id = user_id',
            [userId, pageId, new Date()]
        );
        return true;
    }

    /**
     * Remove page assignment from user
     * @param {number} userId - User ID
     * @param {number} pageId - Page ID
     * @returns {Promise<boolean>} Success status
     */
    static async unassignPage(userId, pageId) {
        const [result] = await pool.query(
            'DELETE FROM user_pages WHERE user_id = ? AND page_id = ?',
            [userId, pageId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Update user's FCM token
     * @param {number} userId - User ID
     * @param {string} token - FCM Token
     * @returns {Promise<boolean>} Success status
     */
    static async updateFCMToken(userId, token) {
        // 1. Clear this token from any OTHER user (ensure 1-to-1 mapping)
        if (token) {
            await pool.query(
                'UPDATE users SET fcm_token = NULL WHERE fcm_token = ? AND id != ?',
                [token, userId]
            );
        }

        // 2. Assign token to the current user
        await pool.query(
            'UPDATE users SET fcm_token = ? WHERE id = ?',
            [token, userId]
        );
        return true;
    }
}

module.exports = User;
