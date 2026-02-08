const pool = require("../config/database");

const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: "Authentication required" });
};

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: "Admin access required" });
};

// Middleware to check if the agent is assigned to the page
const requirePageAccess = async (req, res, next) => {
    // If admin, they have access to all pages
    if (req.session?.role === 'admin') return next();

    let pageId = req.body?.pageId || req.params?.pageId || req.query?.pageId;

    // special case for "all" pages - controller will filter
    if (pageId === 'all') return next();

    const conversationId = req.params?.conversationId || req.body?.conversationId || req.query?.conversationId;

    try {
        // If we don't have pageId but have conversationId, get pageId from DB
        if (!pageId && conversationId) {
            const [convRows] = await pool.query("SELECT page_id FROM conversations WHERE id = ?", [conversationId]);
            if (convRows.length > 0) {
                pageId = convRows[0].page_id;
            }
        }

        if (!pageId) {
            return res.status(400).json({ error: "Page ID or Conversation ID is required" });
        }

        const [rows] = await pool.query(
            "SELECT 1 FROM user_pages WHERE user_id = ? AND page_id = ?",
            [req.session.userId, pageId]
        );

        if (rows.length > 0) {
            return next();
        } else {
            return res.status(403).json({ error: "You are not authorized to view this page's messages" });
        }
    } catch (err) {
        console.error("Authorization Error:", err);
        return res.status(500).json({ error: "Server error during authorization" });
    }
};

module.exports = { requireAuth, requireAdmin, requirePageAccess };
