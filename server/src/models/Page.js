const pool = require('../config/database');

/**
 * Page Model
 * Handles all database operations related to Facebook pages
 */
class Page {
    /**
     * Find page by ID
     * @param {number} pageId - Page ID
     * @returns {Promise<Object|null>} Page object or null
     */
    static async findById(pageId) {
        const [rows] = await pool.query(
            'SELECT * FROM pages WHERE id = ?',
            [pageId]
        );
        return rows[0] || null;
    }

    /**
     * Find page by Facebook page ID
     * @param {string} facebookPageId - Facebook page ID
     * @returns {Promise<Object|null>} Page object or null
     */
    static async findByFacebookId(facebookPageId) {
        const [rows] = await pool.query(
            'SELECT * FROM pages WHERE page_id = ?',
            [facebookPageId]
        );
        return rows[0] || null;
    }

    /**
     * Create a new page
     * @param {Object} pageData - Page data
     * @returns {Promise<Object>} Created page object
     */
    static async create({ page_id, page_name, access_token }) {
        const [result] = await pool.query(
            `INSERT INTO pages (page_id, page_name, access_token, created_at) 
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE page_name = VALUES(page_name), access_token = VALUES(access_token)`,
            [page_id, page_name, access_token]
        );

        // Return the newly created or updated page
        return await this.findByFacebookId(page_id);
    }

    /**
     * Get all pages
     * @returns {Promise<Array>} Array of page objects
     */
    static async findAll() {
        const [rows] = await pool.query(
            'SELECT id, page_id, page_name, created_at FROM pages ORDER BY created_at DESC'
        );
        return rows;
    }

    /**
     * Update page
     * @param {number} pageId - Page ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated page object
     */
    static async update(pageId, updates) {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        });

        values.push(pageId);

        await pool.query(
            `UPDATE pages SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return await this.findById(pageId);
    }

    /**
     * Delete page
     * @param {number} pageId - Page ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(pageId) {
        const [result] = await pool.query(
            'DELETE FROM pages WHERE id = ?',
            [pageId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Get users assigned to a page
     * @param {number} pageId - Page ID
     * @returns {Promise<Array>} Array of user objects
     */
    static async getAssignedUsers(pageId) {
        const [rows] = await pool.query(
            `SELECT u.id, u.username, u.role, u.fcm_token, u.created_at 
       FROM users u
       JOIN user_pages up ON u.id = up.user_id
       WHERE up.page_id = ?`,
            [pageId]
        );
        return rows;
    }
}

module.exports = Page;
