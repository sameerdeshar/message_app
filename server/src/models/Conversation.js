const pool = require('../config/database');

/**
 * Conversation Model - Optimized for Production
 * Handles all database operations related to conversations with denormalized data for performance
 */
class Conversation {
    /**
     * Find conversation by ID
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<Object|null>} Conversation object or null
     */
    static async findById(conversationId) {
        const [rows] = await pool.query(
            'SELECT * FROM conversations WHERE id = ?',
            [conversationId]
        );
        return rows[0] || null;
    }

    /**
     * Find conversation by sender ID and page ID
     * @param {string} senderId - Facebook sender ID
     * @param {number} pageId - Page ID
     * @returns {Promise<Object|null>} Conversation object or null
     */
    static async findBySenderAndPage(senderId, pageId) {
        const [rows] = await pool.query(
            'SELECT * FROM conversations WHERE sender_id = ? AND page_id = ?',
            [senderId, pageId]
        );
        return rows[0] || null;
    }

    /**
     * Create a new conversation
     * @param {Object} conversationData - Conversation data
     * @returns {Promise<Object>} Created conversation object
     */
    static async create({ sender_id, page_id, sender_name = 'Unknown', last_message = '', last_message_time = null }) {
        const [result] = await pool.query(
            `INSERT INTO conversations (sender_id, page_id, sender_name, last_message, last_message_time, created_at) 
       VALUES (?, ?, ?, ?, COALESCE(?, NOW()), NOW())`,
            [sender_id, page_id, sender_name, last_message, last_message_time]
        );
        return await this.findById(result.insertId);
    }

    /**
     * Update conversation
     * @param {number} conversationId - Conversation ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated conversation object
     */
    static async update(conversationId, updates) {
        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        });

        values.push(conversationId);

        await pool.query(
            `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return await this.findById(conversationId);
    }

    /**
     * Get conversations for a page with pagination - OPTIMIZED
     * Uses denormalized fields for 10-100x faster queries
     * @param {number} pageId - Page ID
     * @param {number} limit - Maximum number of conversations
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of conversation objects
     */
    static async findByPage(pageId, limit = 50, offset = 0) {
        const [rows] = await pool.query(
            `SELECT 
                c.id,
                c.user_id,
                c.page_id,
                c.user_name,
                c.profile_pic,
                c.last_message_time,
                c.last_message_text,
                COALESCE(c.unread_count, 0) as unread_count
            FROM conversations c
            WHERE c.page_id = ? AND c.last_message_time IS NOT NULL
            ORDER BY c.last_message_time DESC
            LIMIT ? OFFSET ?`,
            [pageId, limit, offset]
        );
        return rows;
    }

    /**
     * Get all conversations (admin view) - OPTIMIZED
     * @param {number} limit - Maximum number of conversations
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of conversation objects with page info
     */
    static async findAll(limit = 50, offset = 0) {
        const [rows] = await pool.query(
            `SELECT 
                c.id,
                c.user_id,
                c.page_id,
                c.user_name,
                c.profile_pic,
                c.last_message_time,
                c.last_message_text,
                COALESCE(c.unread_count, 0) as unread_count,
                p.name as page_name,
                p.id as facebook_page_id
            FROM conversations c
            LEFT JOIN pages p ON c.page_id = p.id
            WHERE c.last_message_time IS NOT NULL
            ORDER BY c.last_message_time DESC
            LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    }

    /**
     * Get total conversation count (for pagination)
     * @param {string|null} pageId - Page ID (null for all)
     * @returns {Promise<number>} Total count
     */
    static async getCount(pageId = null) {
        let query = 'SELECT COUNT(*) as count FROM conversations WHERE last_message_time IS NOT NULL';
        const params = [];

        if (pageId) {
            query += ' AND page_id = ?';
            params.push(pageId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0].count;
    }

    /**
     * Update conversation metadata on new message (called by trigger or manually)
     * @param {number} conversationId - Conversation ID
     * @param {string} messageText - Latest message text
     * @param {Date} timestamp - Message timestamp
     * @param {boolean} isFromPage - Whether message is from page
     * @returns {Promise<boolean>} Success status
     */
    static async updateOnNewMessage(conversationId, messageText, timestamp, isFromPage) {
        const unreadIncrement = isFromPage ? 0 : 1;

        const [result] = await pool.query(
            `UPDATE conversations 
             SET 
                last_message_time = ?,
                last_message_text = ?,
                unread_count = unread_count + ?
             WHERE id = ?`,
            [timestamp, messageText, unreadIncrement, conversationId]
        );

        return result.affectedRows > 0;
    }

    /**
     * Mark conversation as read (reset unread count)
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<boolean>} Success status
     */
    static async markAsRead(conversationId) {
        const [result] = await pool.query(
            'UPDATE conversations SET unread_count = 0 WHERE id = ?',
            [conversationId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Sync unread count from messages table (for data consistency)
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<number>} Updated unread count
     */
    static async syncUnreadCount(conversationId) {
        const [result] = await pool.query(
            `UPDATE conversations c
             SET unread_count = (
                 SELECT COUNT(*) 
                 FROM messages m
                 WHERE m.conversation_id = c.id 
                 AND m.is_read = FALSE 
                 AND m.is_from_page = FALSE
                 AND m.is_deleted = FALSE
             )
             WHERE c.id = ?`,
            [conversationId]
        );

        // Return the new count
        const conversation = await this.findById(conversationId);
        return conversation?.unread_count || 0;
    }

    /**
     * Delete conversation
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(conversationId) {
        const [result] = await pool.query(
            'DELETE FROM conversations WHERE id = ?',
            [conversationId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Search conversations by user name
     * @param {string} searchTerm - Search term
     * @param {string|null} pageId - Page ID filter (null for all)
     * @param {number} limit - Result limit
     * @returns {Promise<Array>} Matching conversations
     */
    static async search(searchTerm, pageId = null, limit = 50) {
        let query = `
            SELECT 
                c.*,
                p.name as page_name
            FROM conversations c
            LEFT JOIN pages p ON c.page_id = p.id
            WHERE c.user_name LIKE ?
        `;
        const params = [`%${searchTerm}%`];

        if (pageId) {
            query += ' AND c.page_id = ?';
            params.push(pageId);
        }

        query += ' ORDER BY c.last_message_time DESC LIMIT ?';
        params.push(limit);

        const [rows] = await pool.query(query, params);
        return rows;
    }

    /**
     * Get conversation statistics
     * @param {string|null} pageId - Page ID (null for all)
     * @returns {Promise<Object>} Statistics object
     */
    static async getStats(pageId = null) {
        let query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN unread_count > 0 THEN 1 ELSE 0 END) as with_unread,
                SUM(unread_count) as total_unread,
                COUNT(CASE WHEN last_message_time > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as active_24h,
                COUNT(CASE WHEN last_message_time > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_7d
            FROM conversations
            WHERE last_message_time IS NOT NULL
        `;
        const params = [];

        if (pageId) {
            query += ' AND page_id = ?';
            params.push(pageId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0];
    }
}

module.exports = Conversation;

