const pool = require("../config/database");
const bcrypt = require("bcrypt");

// ===================================
// USER MANAGEMENT
// ===================================

exports.createUser = async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) return res.status(400).json({ error: "Missing fields" });
    const userRole = role === 'admin' ? 'admin' : 'agent';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            [username, hashedPassword, userRole]
        );
        res.json({ success: true, userId: result.insertId, message: "User created" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username taken" });
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.listUsers = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.created_at,
                COUNT(DISTINCT up.page_id) as assigned_pages_count
            FROM users u
            LEFT JOIN user_pages up ON u.id = up.user_id
            WHERE u.id != 1
            GROUP BY u.id, u.username, u.role, u.created_at
            ORDER BY u.created_at DESC
        `;
        const [users] = await pool.query(query);
        res.json({ users });
    } catch (err) {
        console.error('List Users Error:', err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    // Protect superadmin (ID 1)
    if (parseInt(id) === 1) {
        return res.status(403).json({ error: "Cannot delete superadmin user" });
    }

    try {
        await pool.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({ success: true, message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
};

// ===================================
// PAGE MANAGEMENT
// ===================================

exports.addPage = async (req, res) => {
    const { id, name, access_token } = req.body;
    // 'id' is the Facebook Page ID

    if (!id || !name || !access_token) return res.status(400).json({ error: "Missing fields" });

    try {
        await pool.query(`
            INSERT INTO pages (id, name, access_token, added_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE name = VALUES(name), access_token = VALUES(access_token)
        `, [id, name, access_token]);
        res.json({ success: true, message: "Page added/updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.listPages = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, 
                p.name, 
                p.added_at,
                COUNT(DISTINCT up.user_id) as assigned_users_count
            FROM pages p
            LEFT JOIN user_pages up ON p.id = up.page_id
            GROUP BY p.id, p.name, p.added_at
            ORDER BY p.added_at DESC
        `;
        const [pages] = await pool.query(query);
        res.json({ pages });
    } catch (err) {
        console.error('List Pages Error:', err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.deletePage = async (req, res) => {
    const { id } = req.params;
    try {
        // Due to FK constraints (ON DELETE CASCADE might not be set), 
        // we might need to delete usage first if strict.
        // Assuming CASCADE is set OR we want soft delete. 
        // If CASCADE is NOT set, this might fail if conversations exist.
        // Let's try direct delete first.

        await pool.query("DELETE FROM pages WHERE id = ?", [id]);
        res.json({ success: true, message: "Page deleted" });
    } catch (err) {
        console.error("Delete Page Error:", err);
        res.status(500).json({ error: "Failed to delete page" });
    }
};

// ===================================
// ASSIGNMENTS
// ===================================

exports.assignPage = async (req, res) => {
    const { userId, pageId } = req.body;
    if (!userId || !pageId) return res.status(400).json({ error: "Missing fields" });

    try {
        await pool.query("INSERT IGNORE INTO user_pages (user_id, page_id) VALUES (?, ?)", [userId, pageId]);
        res.json({ success: true, message: "Page assigned to user" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.unassignPage = async (req, res) => {
    const { userId, pageId } = req.body;
    try {
        await pool.query("DELETE FROM user_pages WHERE user_id = ? AND page_id = ?", [userId, pageId]);
        res.json({ success: true, message: "Page unassigned" });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
};

exports.listAssignments = async (req, res) => {
    // List all mappings: Page Name -> User Name (grouped by user)
    try {
        const query = `
            SELECT 
                u.id as user_id,
                u.username,
                u.role,
                GROUP_CONCAT(p.id) as page_ids,
                GROUP_CONCAT(p.name) as page_names,
                COUNT(up.page_id) as pages_count
            FROM users u
            LEFT JOIN user_pages up ON u.id = up.user_id
            LEFT JOIN pages p ON up.page_id = p.id
            WHERE u.role = 'agent'
            GROUP BY u.id, u.username, u.role
            ORDER BY u.username
        `;
        const [rows] = await pool.query(query);

        // Transform the data into a more usable format
        const assignments = rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            role: row.role,
            pages: row.page_ids ? row.page_ids.split(',').map((id, idx) => ({
                page_id: id,
                page_name: row.page_names.split(',')[idx]
            })) : [],
            pages_count: row.pages_count
        }));

        res.json({ assignments });
    } catch (err) {
        console.error('List Assignments Error:', err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.bulkAssignPages = async (req, res) => {
    const { userId, pageIds } = req.body;

    if (!userId || !Array.isArray(pageIds) || pageIds.length === 0) {
        return res.status(400).json({ error: "Missing or invalid fields" });
    }

    try {
        // Delete existing assignments for this user first
        await pool.query("DELETE FROM user_pages WHERE user_id = ?", [userId]);

        // Insert new assignments
        const values = pageIds.map(pageId => [userId, pageId]);
        await pool.query(
            "INSERT INTO user_pages (user_id, page_id) VALUES ?",
            [values]
        );

        res.json({ success: true, message: `${pageIds.length} pages assigned to user` });
    } catch (err) {
        console.error('Bulk Assign Error:', err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.getUserAssignments = async (req, res) => {
    const { userId } = req.params;

    try {
        // If user is admin (check both DB and Session), return all pages
        const [rows] = await pool.query("SELECT role FROM users WHERE id = ?", [userId]);
        const userRole = rows[0]?.role || '';

        const isAdmin = userRole === 'admin' || req.session.role === 'admin';

        let query;
        let params = [];

        if (isAdmin) {
            query = "SELECT id, name FROM pages ORDER BY name";
        } else {
            query = `
                SELECT p.id, p.name
                FROM user_pages up
                JOIN pages p ON up.page_id = p.id
                WHERE up.user_id = ?
                ORDER BY p.name
            `;
            params = [userId];
        }

        const [pages] = await pool.query(query, params);
        res.json({ pages });
    } catch (err) {
        console.error('Get User Assignments Error:', err);
        res.status(500).json({ error: "Database error" });
    }
};
