const pool = require('../config/database');

/**
 * Message Model - Optimized for High Performance
 * Handles all database operations related to messages with pagination and caching support
 */
class Message {
    /**
     * Find message by ID
     * @param {number} messageId - Message ID
     * @returns {Promise<Object|null>} Message object or null
     */
    static async findById(messageId) {
        const [rows] = await pool.query(
            'SELECT * FROM messages WHERE id = ? AND is_deleted = FALSE',
            [messageId]
        );
        return rows[0] || null;
    }

    /**
     * Get messages for a conversation with cursor-based pagination
     * @param {number} conversationId - Conversation ID
     * @param {Object} options - Pagination options
     * @param {number} options.limit - Maximum number of messages to return (default: 50)
     * @param {number} options.beforeMessageId - Load messages before this ID (for loading older)
     * @param {number} options.afterMessageId - Load messages after this ID (for loading newer)
     * @returns {Promise<Array>} Array of message objects
     */
    static async findByConversation(conversationId, options = {}) {
        const {
            limit = 50,
            beforeMessageId = null,  // For loading older messages (scroll up)
            afterMessageId = null    // For loading newer messages (new messages arrived)
        } = options;

        let query = `
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            AND is_deleted = FALSE
        `;
        const params = [conversationId];

        // Pagination logic
        if (beforeMessageId) {
            // Loading older messages (scroll up)
            query += ` AND id < ?`;
            params.push(beforeMessageId);
        } else if (afterMessageId) {
            // Loading newer messages
            query += ` AND id > ?`;
            params.push(afterMessageId);
        }

        // Order by ID DESC to get newest first, then reverse for chronological order
        query += ` ORDER BY id DESC LIMIT ?`;
        params.push(Math.min(limit, 100)); // Cap at 100 to prevent abuse

        const [rows] = await pool.query(query, params);

        // Return in chronological order (oldest first) unless loading newer messages
        return afterMessageId ? rows : rows.reverse();
    }

    /**
     * Get total message count for a conversation (for pagination metadata)
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<number>} Total count of non-deleted messages
     */
    static async getConversationMessageCount(conversationId) {
        const [rows] = await pool.query(
            `SELECT COUNT(*) as count FROM messages 
             WHERE conversation_id = ? AND is_deleted = FALSE`,
            [conversationId]
        );
        return rows[0].count;
    }

    /**
     * Create a new message
     * @param {Object} messageData - Message data
     * @returns {Promise<Object>} Created message object
     */
    static async create({
        conversation_id,
        sender_id,
        recipient_id,
        message,
        text,  // Support both 'message' and 'text' for backwards compatibility
        image_url = null,
        is_from_page = false
    }) {
        const messageText = text || message || '';

        const [result] = await pool.query(
            `INSERT INTO messages 
            (conversation_id, sender_id, recipient_id, text, image_url, is_from_page, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [conversation_id, sender_id, recipient_id, messageText, image_url, is_from_page, new Date()]
        );

        return await this.findById(result.insertId);
    }

    /**
     * Soft delete a message (marks as deleted but keeps in database)
     * @param {number} messageId - Message ID
     * @returns {Promise<boolean>} Success status
     */
    static async delete(messageId) {
        const [result] = await pool.query(
            'UPDATE messages SET is_deleted = TRUE WHERE id = ?',
            [messageId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Hard delete a message (permanently removes from database)
     * @param {number} messageId - Message ID
     * @returns {Promise<boolean>} Success status
     */
    static async hardDelete(messageId) {
        const [result] = await pool.query(
            'DELETE FROM messages WHERE id = ?',
            [messageId]
        );
        return result.affectedRows > 0;
    }

    /**
     * Mark messages as read
     * @param {Array<number>} messageIds - Array of message IDs
     * @returns {Promise<boolean>} Success status
     */
    static async markAsRead(messageIds) {
        if (!messageIds || messageIds.length === 0) return false;

        const placeholders = messageIds.map(() => '?').join(',');
        const [result] = await pool.query(
            `UPDATE messages SET is_read = TRUE WHERE id IN (${placeholders})`,
            messageIds
        );
        return result.affectedRows > 0;
    }

    /**
     * Mark all messages in a conversation as read
     * @param {number} conversationId - Conversation ID
     * @param {boolean} onlyFromCustomer - Only mark customer messages as read (default: true)
     * @returns {Promise<number>} Number of messages marked as read
     */
    static async markConversationAsRead(conversationId, onlyFromCustomer = true) {
        let query = 'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND is_read = FALSE';
        const params = [conversationId];

        if (onlyFromCustomer) {
            query += ' AND is_from_page = FALSE';
        }

        const [result] = await pool.query(query, params);

        // Update conversation unread count
        if (result.affectedRows > 0) {
            await pool.query(
                'UPDATE conversations SET unread_count = 0 WHERE id = ?',
                [conversationId]
            );
        }

        return result.affectedRows;
    }

    /**
     * Get unread count for a conversation
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<number>} Count of unread messages
     */
    static async getUnreadCount(conversationId) {
        const [rows] = await pool.query(
            `SELECT COUNT(*) as count FROM messages 
             WHERE conversation_id = ? 
             AND is_read = FALSE 
             AND is_from_page = FALSE 
             AND is_deleted = FALSE`,
            [conversationId]
        );
        return rows[0].count;
    }

    /**
     * Search messages by text content
     * @param {number} conversationId - Conversation ID
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum results
     * @returns {Promise<Array>} Array of matching messages
     */
    static async search(conversationId, searchTerm, limit = 50) {
        const [rows] = await pool.query(
            `SELECT * FROM messages 
             WHERE conversation_id = ? 
             AND text LIKE ?
             AND is_deleted = FALSE
             ORDER BY timestamp DESC
             LIMIT ?`,
            [conversationId, `%${searchTerm}%`, limit]
        );
        return rows;
    }

    /**
     * Get recent messages across all conversations (for dashboard/feed)
     * @param {Array<number>} conversationIds - Array of conversation IDs
     * @param {number} limit - Maximum messages per conversation
     * @returns {Promise<Object>} Object mapping conversation_id to messages array
     */
    static async getRecentForConversations(conversationIds, limit = 10) {
        if (!conversationIds || conversationIds.length === 0) return {};

        const placeholders = conversationIds.map(() => '?').join(',');

        const [rows] = await pool.query(
            `SELECT * FROM (
                SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY id DESC) as rn
                FROM messages
                WHERE conversation_id IN (${placeholders})
                AND is_deleted = FALSE
            ) ranked
            WHERE rn <= ?
            ORDER BY conversation_id, id ASC`,
            [...conversationIds, limit]
        );

        // Group by conversation_id
        const result = {};
        rows.forEach(row => {
            if (!result[row.conversation_id]) {
                result[row.conversation_id] = [];
            }
            result[row.conversation_id].push(row);
        });

        return result;
    }

    /**
     * Delete messages older than specified days
     * @param {number} conversationId - Conversation ID
     * @param {number} days - Number of days (messages older than this will be deleted)
     * @returns {Promise<number>} Number of messages deleted
     */
    static async deleteOlderThan(conversationId, days) {
        const [result] = await pool.query(
            `DELETE FROM messages 
             WHERE conversation_id = ? 
             AND timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [conversationId, days]
        );
        return result.affectedRows;
    }

    /**
     * Archive messages to archive table (for data retention strategy)
     * @param {number} days - Archive messages older than this many days
     * @returns {Promise<number>} Number of messages archived
     */
    static async archiveOldMessages(days = 7) {
        try {
            // This calls the stored procedure created in migration
            const [[result]] = await pool.query(
                'CALL archive_old_messages(?)',
                [days]
            );
            return result.messages_archived || 0;
        } catch (error) {
            console.error('Archive error:', error);
            throw new Error('Failed to archive messages: ' + error.message);
        }
    }

    /**
     * Get message statistics for a conversation
     * @param {number} conversationId - Conversation ID
     * @returns {Promise<Object>} Statistics object
     */
    static async getStats(conversationId) {
        const [rows] = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_from_page = TRUE THEN 1 ELSE 0 END) as from_page,
                SUM(CASE WHEN is_from_page = FALSE THEN 1 ELSE 0 END) as from_customer,
                SUM(CASE WHEN is_read = FALSE AND is_from_page = FALSE THEN 1 ELSE 0 END) as unread,
                MIN(timestamp) as first_message_at,
                MAX(timestamp) as last_message_at
             FROM messages
             WHERE conversation_id = ?
             AND is_deleted = FALSE`,
            [conversationId]
        );

        return rows[0] || {
            total: 0,
            from_page: 0,
            from_customer: 0,
            unread: 0,
            first_message_at: null,
            last_message_at: null
        };
    }
}

module.exports = Message;
