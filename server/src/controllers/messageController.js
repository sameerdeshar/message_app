const pool = require("../config/database");
const facebookService = require("../services/facebookService");

// Helper: Check if user has access to a page (Admin or Assigned)
async function hasPageAccess(userId, userRole, pageId) {
    if (userRole === 'admin') return true;
    const [rows] = await pool.query("SELECT 1 FROM user_pages WHERE user_id = ? AND page_id = ?", [userId, pageId]);
    return rows.length > 0;
}

// GET /api/messages/pages
exports.getMyPages = async (req, res) => {
    try {
        const { userId, role } = req.session;
        let query = "", params = [];

        if (role === 'admin') {
            query = "SELECT id, name FROM pages";
        } else {
            query = `
                SELECT p.id, p.name 
                FROM pages p 
                JOIN user_pages up ON p.id = up.page_id 
                WHERE up.user_id = ?
            `;
            params = [userId];
        }

        const [pages] = await pool.query(query, params);
        res.json(pages);
    } catch (err) {
        console.error("getMyPages Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// GET /api/messages/conversations?pageId=123&page=1&limit=30 (Filtered)
exports.listConversations = async (req, res) => {
    const pageId = req.query.pageId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    if (!pageId) return res.status(400).json({ error: "pageId required" });

    if (pageId === 'all') {
        return exports.getAllConversations(req, res);
    }

    try {
        const query = `
            SELECT c.*, p.name as page_name, MAX(m.timestamp) as latest_msg_time, 
                   (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as latest_msg_text
            FROM conversations c
            JOIN pages p ON c.page_id = p.id
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.page_id = ?
            GROUP BY c.id
            ORDER BY latest_msg_time DESC
            LIMIT ? OFFSET ?
        `;

        const [conversations] = await pool.query(query, [pageId, limit, offset]);

        // Get total count for pagination metadata
        // Note: Counting distinct conversations for this page
        const [countResult] = await pool.query(
            "SELECT COUNT(*) as total FROM conversations WHERE page_id = ?",
            [pageId]
        );

        const total = countResult[0].total;

        res.json({
            data: conversations,
            pagination: {
                page,
                limit,
                total,
                hasMore: (offset + conversations.length) < total
            }
        });
    } catch (err) {
        console.error("listConversations Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.deleteMessage = async (req, res) => {
    const { id } = req.params;
    try {
        // Soft delete: keep the record, just mark as deleted
        // Ideally check ownership/permissions here
        await pool.query("UPDATE messages SET is_deleted = 1 WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting message:", err);
        res.status(500).json({ error: "Failed to delete message" });
    }
};

// GET /api/messages/all_conversations (Unified Inbox)
exports.getAllConversations = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    try {
        let baseQuery = `
            FROM conversations c
            JOIN pages p ON c.page_id = p.id
            LEFT JOIN messages m ON c.id = m.conversation_id
        `;

        const params = [];

        // If Agent, restrict to assigned pages
        if (req.session.role !== 'admin') {
            baseQuery += ` JOIN user_pages up ON p.id = up.page_id WHERE up.user_id = ? `;
            params.push(req.session.userId);
        }

        const dataQuery = `
            SELECT c.*, p.name as page_name, MAX(m.timestamp) as latest_msg_time, 
                   (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as latest_msg_text
            ${baseQuery}
            GROUP BY c.id 
            ORDER BY latest_msg_time DESC
            LIMIT ? OFFSET ?
        `;

        const [conversations] = await pool.query(dataQuery, [...params, limit, offset]);

        // Count Query needs to be a bit smarter because of the GROUP BY in the main query
        // The main query groups by conversation ID. So we count distinct conversation IDs matching the criteria.

        let countQuery = "";
        let countParams = [];

        if (req.session.role !== 'admin') {
            // Re-construct for count to avoid complex subqueries if possible, or just use simpler valid count
            // actually, counting distinct c.id is correct.
            countQuery = `
                SELECT COUNT(DISTINCT c.id) as total
                FROM conversations c
                JOIN pages p ON c.page_id = p.id
                JOIN user_pages up ON p.id = up.page_id 
                WHERE up.user_id = ?
             `;
            countParams = [req.session.userId];
        } else {
            countQuery = `SELECT COUNT(*) as total FROM conversations`;
        }

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            data: conversations,
            pagination: {
                page,
                limit,
                total,
                hasMore: (offset + conversations.length) < total
            }
        });
    } catch (err) {
        console.error("getAllConversations Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// GET /api/messages/:conversationId
// Supports pagination: ?limit=50&before=messageId&after=messageId
exports.getMessages = async (req, res) => {
    const { conversationId } = req.params;
    const { limit = 50, before, after } = req.query;

    try {
        // Fetch conversation details (including user_id for notes and page name)
        const [convs] = await pool.query(`
            SELECT c.*, p.name as page_name 
            FROM conversations c 
            JOIN pages p ON c.page_id = p.id 
            WHERE c.id = ?
        `, [conversationId]);
        if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

        const pageId = convs[0].page_id;

        // Verify Access
        if (!(await hasPageAccess(req.session.userId, req.session.role, pageId))) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Build paginated query
        let query = `
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            AND is_deleted = FALSE
        `;
        const params = [conversationId];

        if (before) {
            query += ` AND id < ?`;
            params.push(parseInt(before));
        } else if (after) {
            query += ` AND id > ?`;
            params.push(parseInt(after));
        }

        query += ` ORDER BY id DESC LIMIT ?`;
        params.push(Math.min(parseInt(limit), 100));

        const [messages] = await pool.query(query, params);

        // Fetch agent names for messages from page
        if (messages.length > 0) {
            const agentIds = [...new Set(messages.filter(m => m.is_from_page && m.agent_id).map(m => m.agent_id))];
            if (agentIds.length > 0) {
                const [agents] = await pool.query("SELECT id, username FROM users WHERE id IN (?)", [agentIds]);
                const agentMap = {};
                agents.forEach(a => agentMap[a.id] = a.username);

                messages.forEach(m => {
                    if (m.agent_id && agentMap[m.agent_id]) {
                        m.agent_name = agentMap[m.agent_id];
                    }
                });
            }
        }

        // Get total count for pagination metadata
        const [countResult] = await pool.query(
            "SELECT COUNT(*) as total FROM messages WHERE conversation_id = ? AND is_deleted = FALSE",
            [conversationId]
        );

        // Return in chronological order (reverse if loading older messages)
        const messagesOrdered = after ? messages : messages.reverse();

        res.json({
            conversation: convs[0], // Include conversation metadata (user_id, etc.)
            messages: messagesOrdered,
            pagination: {
                total: countResult[0].total,
                hasMore: messages.length === parseInt(limit),
                oldestId: messagesOrdered[0]?.id,
                newestId: messagesOrdered[messagesOrdered.length - 1]?.id
            }
        });
    } catch (err) {
        console.error("getMessages Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// POST /api/messages/reply
// POST /api/messages/reply
exports.replyToMessage = async (req, res) => {
    const conversationId = req.params.conversationId || req.body.conversationId;
    const { message, imageUrl } = req.body; // Remove clientMessageId
    const { userId } = req.session;

    console.log("message0", message);

    if (!message && !imageUrl) return res.status(400).json({ error: "Message or image required" });

    try {
        // Get conversation details
        const [convRows] = await pool.query("SELECT * FROM conversations WHERE id = ?", [conversationId]);
        if (convRows.length === 0) return res.status(404).json({ error: "Conversation not found" });
        const conv = convRows[0];

        // Verify Access
        if (!(await hasPageAccess(req.session.userId, req.session.role, conv.page_id))) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Determine sender/recipient (Page replying to User)
        const senderId = conv.page_id;
        const recipientId = conv.user_id;

        // Quick Fix: Add columns if not exists
        try {
            await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT");
            await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted TINYINT DEFAULT 0");
        } catch (e) { /* ignore if exists */ }

        // Get Page Token for sending to Facebook
        const [pages] = await pool.query("SELECT access_token FROM pages WHERE id = ?", [conv.page_id]);
        if (pages.length === 0) return res.status(500).json({ error: "Page token missing" });
        const pageToken = pages[0].access_token;

        // Send to Facebook API
        try {
            if (imageUrl) {
                // If it's a local path, make it a full URL
                let metaImageUrl = imageUrl;
                if (imageUrl.startsWith('/uploads/')) {
                    let host = req.get('host');
                    let protocol = req.protocol;
                    if (process.env.NODE_ENV === 'production' || host.includes('graceportpro')) {
                        protocol = 'https';
                    }
                    metaImageUrl = `${protocol}://${host}${imageUrl}`;
                    console.log("🔗 Sending Attachment to Meta (Reply):", metaImageUrl);
                }

                try {
                    await facebookService.sendImageMessage(pageToken, recipientId, metaImageUrl);
                } catch (fbErr) {
                    // Retry with HUMAN_AGENT tag if it's a window error (Code 10)
                    if (fbErr.response?.data?.error?.code === 10) {
                        console.log("🔄 Retrying Image with HUMAN_AGENT tag...");
                        await facebookService.sendImageMessage(pageToken, recipientId, metaImageUrl, {
                            messaging_type: "MESSAGE_TAG",
                            tag: "HUMAN_AGENT"
                        });
                    } else {
                        throw fbErr;
                    }
                }
            } else {
                try {
                    await facebookService.sendMessage(pageToken, recipientId, message);
                } catch (fbErr) {
                    // Retry with HUMAN_AGENT tag if it's a window error (Code 10)
                    if (fbErr.response?.data?.error?.code === 10) {
                        console.log("🔄 Retrying Message with HUMAN_AGENT tag...");
                        await facebookService.sendMessage(pageToken, recipientId, message, {
                            messaging_type: "MESSAGE_TAG",
                            tag: "HUMAN_AGENT"
                        });
                    } else {
                        throw fbErr;
                    }
                }
            }
        } catch (fbErr) {
            const fbErrorData = fbErr.response?.data?.error || {};
            console.error("❌ Meta API Error (Reply Failed):", fbErrorData.message || fbErr.message);

            let errorMessage = "Failed to send message to Meta";
            if (fbErrorData.code === 10) {
                errorMessage = "Message window closed. You can only respond up to 7 days after the last customer message.";
            } else if (fbErrorData.code === 100 && fbErrorData.error_subcode === 2018276) {
                errorMessage = "HUMAN_AGENT approval missing. Please enable 'Human Agent' feature in your Meta App Dashboard.";
            }

            return res.status(502).json({
                error: errorMessage,
                details: fbErrorData.message || fbErr.message,
                fbCode: fbErrorData.code,
                fbSubcode: fbErrorData.error_subcode
            });
        }

        // ✅ ONLY SAVE TO DB IF SEND SUCCEEDED
        console.log("🛠️ DB DEBUG: Attempting to save message via replyToMessage...");
        const timestamp = new Date();
        const query = "INSERT INTO messages (conversation_id, sender_id, recipient_id, text, image_url, is_from_page, timestamp, agent_id) VALUES (?, ?, ?, ?, ?, 1, ?, ?)";
        const [result] = await pool.query(query, [conversationId, conv.page_id, conv.user_id, message || '', imageUrl || null, timestamp, req.session.userId]);
        console.log("✅ DB DEBUG: Successfully saved message via replyToMessage, ID:", result.insertId);

        const newMessage = {
            id: result.insertId,
            conversation_id: conversationId,
            sender_id: conv.page_id,
            recipient_id: conv.user_id,
            text: message || '',
            image_url: imageUrl || null,
            timestamp: timestamp,
            is_from_page: 1,
            is_deleted: 0,
            agent_id: req.session.userId
        };

        // NOTE: We don't broadcast here because Facebook will echo the message back
        // via webhook, but we now ignore echoes, so the frontend adds it immediately

        res.json(newMessage);
    } catch (err) {
        console.error("Error sending reply:", err);
        res.status(500).json({ error: "Failed to send reply: " + err.message });
    }
};

// PUT /api/messages/:conversationId/name
exports.updateConversationName = async (req, res) => {
    const { conversationId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });

    try {
        const [convs] = await pool.query("SELECT page_id, user_id FROM conversations WHERE id = ?", [conversationId]);
        if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

        // Access check
        if (!(await hasPageAccess(req.session.userId, req.session.role, convs[0].page_id))) {
            return res.status(403).json({ error: "Access denied" });
        }

        const customerId = convs[0].user_id; // The user_id is the customer PSID

        // 1. Update Global Customers Registry
        await pool.query(`
            INSERT INTO customers (id, name) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name)
        `, [customerId, name.trim()]);

        // 2. Update all conversations for this customer
        await pool.query("UPDATE conversations SET user_name = ? WHERE user_id = ?", [name.trim(), customerId]);

        res.json({ success: true, name: name.trim() });
    } catch (err) {
        console.error("Update Name Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// DELETE /api/messages/:conversationId/conversation
exports.deleteConversation = async (req, res) => {
    const { conversationId } = req.params;

    try {
        // Get conversation details
        const [convs] = await pool.query("SELECT page_id, user_id, user_name FROM conversations WHERE id = ?", [conversationId]);
        if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

        // Access check
        if (!(await hasPageAccess(req.session.userId, req.session.role, convs[0].page_id))) {
            return res.status(403).json({ error: "Access denied" });
        }

        const customerId = convs[0].user_id;
        const userName = convs[0].user_name;
        const pageId = convs[0].page_id;

        // 1. Delete all messages for this conversation
        await pool.query("DELETE FROM messages WHERE conversation_id = ?", [conversationId]);

        // 2. Update conversation: reset last_message_time, keep user identity
        await pool.query(
            "UPDATE conversations SET last_message_time = NULL WHERE id = ?",
            [conversationId]
        );

        // 3. Preserve customer info in customers table
        await pool.query(
            "INSERT INTO customers (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
            [customerId, userName]
        );

        // 4. Emit real-time update
        const io = req.app.get("io");
        if (io) {
            io.to('admin_room').emit("conversation_deleted", { id: conversationId });
            io.to(`page_${pageId}`).emit("conversation_deleted", { id: conversationId });
        }

        res.json({ success: true, message: "Conversation deleted successfully" });
    } catch (err) {
        console.error("Delete Conversation Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};
// DELETE /api/messages/:conversationId/cleanup?period=7d
exports.deleteOlderMessages = async (req, res) => {
    const { conversationId } = req.params;
    const { period } = req.query; // '7d', '1m', '3m'

    let days;
    switch (period) {
        case '1d': days = 1; break;
        case '2d': days = 2; break;
        case '7d': days = 7; break;
        case '15d': days = 15; break;
        case '1m': days = 30; break; // Keep for backward compat
        case '3m': days = 90; break; // Keep for backward compat
        default: return res.status(400).json({ error: "Invalid period. Use 1d, 2d, 7d, 15d." });
    }

    try {
        const [convs] = await pool.query("SELECT page_id FROM conversations WHERE id = ?", [conversationId]);
        if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

        if (!(await hasPageAccess(req.session.userId, req.session.role, convs[0].page_id))) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Hard delete older messages
        const [result] = await pool.query(
            "DELETE FROM messages WHERE conversation_id = ? AND timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)",
            [conversationId, days]
        );

        res.json({ success: true, deletedCount: result.affectedRows });
    } catch (err) {
        console.error("Delete Older Messages Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// DELETE /api/messages/:conversationId/latest
exports.deleteLatestMessage = async (req, res) => {
    const { conversationId } = req.params;

    try {
        const [convs] = await pool.query("SELECT page_id FROM conversations WHERE id = ?", [conversationId]);
        if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

        if (!(await hasPageAccess(req.session.userId, req.session.role, convs[0].page_id))) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Find the latest message ID
        const [lastMsg] = await pool.query(
            "SELECT id FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC, id DESC LIMIT 1",
            [conversationId]
        );

        if (lastMsg.length === 0) {
            return res.status(404).json({ error: "No messages found in this conversation" });
        }

        // Use the existing soft delete pattern or hard delete? 
        // User asked to "delete" which usually implies removal from sight.
        // I'll stick to hard delete for these specific "cleanup" tools to actually save space.
        await pool.query("DELETE FROM messages WHERE id = ?", [lastMsg[0].id]);

        res.json({ success: true, messageId: lastMsg[0].id });
    } catch (err) {
        console.error("Delete Latest Message Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// PUT /api/messages/:conversationId/read
exports.markConversationAsRead = async (req, res) => {
    const { conversationId } = req.params;

    try {
        // 1. Mark all messages in this conversation as read
        await pool.query(
            "UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND is_read = FALSE AND is_from_page = FALSE",
            [conversationId]
        );

        // 2. Reset unread count in conversations table
        // (The trigger handle_unread_on_read should also handle this if it exists, 
        // but explicit update ensures consistency)
        await pool.query(
            "UPDATE conversations SET unread_count = 0 WHERE id = ?",
            [conversationId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Mark as Read Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};

// POST /api/messages/:conversationId/upload
// Note: This expects multipart/form-data with an 'image' field
exports.uploadImage = async (req, res) => {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
    }

    try {
        const imageUrl = `/uploads/${req.file.filename}`;

        // Force HTTPS in production or if BASE_URL is provided
        // Meta often rejects plain http:// URLs
        let host = req.get('host');
        let protocol = req.protocol;

        // If your server is running behind a proxy (Nginx), trust proxy should handle this,
        // but we can be explicit here to ensure it's https for Meta.
        if (process.env.NODE_ENV === 'production' || host.includes('graceportpro')) {
            protocol = 'https';
        }

        const fullImageUrl = `${protocol}://${host}${imageUrl}`;
        console.log("🔗 Sending Attachment to Meta:", fullImageUrl);

        // Get conversation details
        const [convs] = await pool.query("SELECT * FROM conversations WHERE id = ?", [conversationId]);
        if (convs.length === 0) return res.status(404).json({ error: "Conversation not found" });

        const conv = convs[0];

        // 1. Get Page Token
        const [pages] = await pool.query("SELECT access_token FROM pages WHERE id = ?", [conv.page_id]);
        if (pages.length === 0) return res.status(500).json({ error: "Page token missing" });
        const pageToken = pages[0].access_token;

        // 2. Send to Facebook API first
        try {
            try {
                await facebookService.sendImageMessage(pageToken, conv.user_id, fullImageUrl);
            } catch (fbErr) {
                // Retry with HUMAN_AGENT tag if it's a window error (Code 10)
                if (fbErr.response?.data?.error?.code === 10) {
                    console.log("🔄 Retrying Image Upload with HUMAN_AGENT tag...");
                    await facebookService.sendImageMessage(pageToken, conv.user_id, fullImageUrl, {
                        messaging_type: "MESSAGE_TAG",
                        tag: "HUMAN_AGENT"
                    });
                } else {
                    throw fbErr;
                }
            }
        } catch (fbErr) {
            const fbErrorData = fbErr.response?.data?.error || {};
            console.error("❌ Meta API Error (Image Send Failed):", fbErrorData.message || fbErr.message);

            let errorMessage = "Failed to send image to Meta (Facebook)";
            if (fbErrorData.code === 10) {
                errorMessage = "Message window closed. You can only respond up to 7 days after the last customer message.";
            } else if (fbErrorData.code === 100 && fbErrorData.error_subcode === 2018276) {
                errorMessage = "HUMAN_AGENT approval missing. Please enable 'Human Agent' feature in your Meta App Dashboard.";
            }

            return res.status(502).json({
                error: errorMessage,
                details: fbErrorData.message || fbErr.message,
                suggest: fbErrorData.code === 10 ? "Customers must interact within the last 7 days." : "Ensure your server is publicly accessible via HTTPS (e.g., ngrok) so Meta can fetch the image.",
                fbCode: fbErrorData.code
            });
        }

        // 3. Store in database (Messages) - ✅ ONLY ON SUCCESS
        console.log("🛠️ DB DEBUG: Attempting to save message via uploadImage...");
        const timestamp = new Date();
        const [result] = await pool.query(
            "INSERT INTO messages (conversation_id, sender_id, recipient_id, text, image_url, is_from_page, timestamp, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [conversationId, conv.page_id, conv.user_id, message || '', imageUrl, true, timestamp, req.session.userId]
        );
        console.log("✅ DB DEBUG: Successfully saved message via uploadImage, ID:", result.insertId);

        // 3b. Store in database (Media Library Tracking)
        try {
            await pool.query(
                "INSERT INTO media (filename, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)",
                [req.file.filename, req.session.userId]
            );
        } catch (mediaErr) {
            console.error("Failed to track media owner:", mediaErr);
            // Non-critical, continue
        }

        // 4. Update conversation metadata
        await pool.query(
            "UPDATE conversations SET last_message_text = ?, last_message_time = CURRENT_TIMESTAMP WHERE id = ?",
            [message || '📷 Photo', conversationId]
        );

        res.json({
            success: true,
            message: {
                id: result.insertId,
                conversation_id: conversationId,
                text: message || '',
                image_url: imageUrl,
                is_from_page: true,
                timestamp: timestamp,
                agent_id: req.session.userId,
                agent_name: req.session.username // Assuming username is in session, if not we can just store ID and let next fetch get it
            }
        });
    } catch (err) {
        console.error("Upload Image Error:", err);
        res.status(500).json({ error: "Database error" });
    }
};
