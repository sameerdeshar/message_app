const pool = require("../config/database");
const fs = require('fs');
const path = require('path');

/**
 * Database Admin Controller
 * Provides phpMyAdmin-like functionality for database management
 */

// GET /api/database/tables - List all tables in the database
exports.listTables = async (req, res) => {
    try {
        const [tables] = await pool.query("SHOW TABLES");
        const dbName = process.env.DB_NAME || 'messenger';
        const tableKey = `Tables_in_${dbName}`;

        // Get row count for each table
        const tablesWithCounts = await Promise.all(
            tables.map(async (tableObj) => {
                const tableName = tableObj[tableKey];
                const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                return {
                    name: tableName,
                    rowCount: countResult[0].count
                };
            })
        );

        res.json({ tables: tablesWithCounts });
    } catch (err) {
        console.error("List tables error:", err);
        res.status(500).json({ error: "Failed to list tables" });
    }
};

/**
 * Internal Helper: Get primary key column for a table
 */
const getPrimaryKey = async (tableName) => {
    try {
        const [rows] = await pool.query(`SHOW KEYS FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`);
        return rows[0]?.Column_name || 'id'; // Fallback to 'id' if no PK found
    } catch (err) {
        return 'id';
    }
};

/**
 * Internal Helper: Clean data for MySQL execution
 * Converts ISO date strings to MySQL datetime format
 */
const sanitizeData = (data) => {
    const cleaned = { ...data };
    for (const key in cleaned) {
        const val = cleaned[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            // ISO Date: 2026-01-26T15:40:03.000Z -> 2026-01-26 15:40:03
            cleaned[key] = val.slice(0, 19).replace('T', ' ');
        }
        // Also handle nulls/empty strings if needed, but MySQL driver handles them well usually
    }
    return cleaned;
};

// GET /api/database/tables/:tableName/schema - Get table structure
exports.getTableSchema = async (req, res) => {
    const { tableName } = req.params;

    try {
        const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);
        res.json({ schema: columns });
    } catch (err) {
        console.error(`Get schema error for ${tableName}:`, err);
        res.status(500).json({ error: `Failed to get table schema for ${tableName}: ${err.message}` });
    }
};

// GET /api/database/tables/:tableName/data - Get table data with pagination
exports.getTableData = async (req, res) => {
    const { tableName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
        // Get total count
        const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Get paginated data
        const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]);

        res.json({
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (err) {
        console.error(`Get table data error for ${tableName}:`, err);
        res.status(500).json({ error: `Failed to get data for ${tableName}: ${err.message}` });
    }
};

// POST /api/database/tables/:tableName/insert - Insert new row
exports.insertRow = async (req, res) => {
    const { tableName } = req.params;
    const data = req.body;

    try {
        const cleanedData = sanitizeData(data);
        const [result] = await pool.query(`INSERT INTO \`${tableName}\` SET ?`, [cleanedData]);
        res.json({
            success: true,
            insertId: result.insertId,
            message: "Row inserted successfully"
        });
    } catch (err) {
        console.error(`Insert row error into ${tableName}:`, err, data);
        res.status(500).json({ error: `Failed to insert row into ${tableName}: ${err.message}` });
    }
};

// PUT /api/database/tables/:tableName/update - Update existing row
exports.updateRow = async (req, res) => {
    const { tableName } = req.params;
    const { id, ...updates } = req.body;

    if (id === undefined || id === null) {
        return res.status(400).json({ error: "Row ID is required" });
    }

    try {
        const pk = await getPrimaryKey(tableName);
        const cleanedUpdates = sanitizeData(updates);

        const [result] = await pool.query(`UPDATE \`${tableName}\` SET ? WHERE \`${pk}\` = ?`, [cleanedUpdates, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Row not found or no changes made" });
        }

        res.json({
            success: true,
            affectedRows: result.affectedRows,
            message: "Row updated successfully"
        });
    } catch (err) {
        console.error(`Update row error in ${tableName} (ID: ${id}):`, err, updates);
        res.status(500).json({ error: `Failed to update row in ${tableName}: ${err.message}` });
    }
};

// DELETE /api/database/tables/:tableName/delete - Delete row
exports.deleteRow = async (req, res) => {
    const { tableName } = req.params;
    const { id } = req.body;

    if (id === undefined || id === null) {
        return res.status(400).json({ error: "Row ID is required" });
    }

    try {
        const pk = await getPrimaryKey(tableName);
        const [result] = await pool.query(`DELETE FROM \`${tableName}\` WHERE \`${pk}\` = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Row not found" });
        }

        res.json({
            success: true,
            affectedRows: result.affectedRows,
            message: "Row deleted successfully"
        });
    } catch (err) {
        console.error(`Delete row error in ${tableName} (ID: ${id}):`, err);
        res.status(500).json({ error: `Failed to delete row from ${tableName}: ${err.message}` });
    }
};

// POST /api/database/query - Execute custom SQL query
exports.executeQuery = async (req, res) => {
    const { query, confirmed = false } = req.body;

    if (!query || !query.trim()) {
        return res.status(400).json({ error: "Query is required" });
    }

    try {
        // Check for dangerous operations
        const dangerousPattern = /\b(DROP|TRUNCATE|ALTER|CREATE)\b/i;
        const isDangerous = dangerousPattern.test(query);

        if (isDangerous && !confirmed) {
            return res.status(400).json({
                warning: "This query contains potentially dangerous operations (DROP, TRUNCATE, ALTER, CREATE). Please confirm to proceed.",
                requiresConfirmation: true
            });
        }

        // Execute the query
        const [results] = await pool.query(query);

        // Determine response type based on query
        const isSelect = /^\s*SELECT/i.test(query);

        if (isSelect) {
            res.json({
                success: true,
                data: results,
                rowCount: results.length,
                message: `Query returned ${results.length} row(s)`
            });
        } else {
            res.json({
                success: true,
                affectedRows: results.affectedRows || 0,
                insertId: results.insertId || null,
                message: `Query executed successfully. ${results.affectedRows || 0} row(s) affected.`
            });
        }
    } catch (err) {
        console.error("Execute query error:", err);
        res.status(500).json({
            error: "Query execution failed: " + err.message,
            sqlMessage: err.sqlMessage || err.message
        });
    }
};

// GET /api/database/media - List uploaded media files (filtered by owner if agent)
exports.listMedia = async (req, res) => {
    try {
        const { userId, role } = req.session;
        let query = "SELECT * FROM media";
        let params = [];

        if (role !== 'admin') {
            query += " WHERE user_id = ?";
            params.push(userId);
        }

        query += " ORDER BY created_at DESC";
        const [rows] = await pool.query(query, params);

        const fileDetails = rows.map(file => ({
            name: file.filename,
            createdAt: file.created_at,
            url: `/uploads/${file.filename}`
        }));

        res.json({ files: fileDetails });
    } catch (err) {
        console.error("List media error:", err);
        // Fallback to file system if table doesn't exist yet (for transition)
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return exports.listMediaLegacy(req, res);
        }
        res.status(500).json({ error: "Failed to list media files" });
    }
};

// Legacy fallback for listing media (no owner tracking)
exports.listMediaLegacy = async (req, res) => {
    const uploadsPath = path.join(process.cwd(), 'public/uploads');
    try {
        if (!fs.existsSync(uploadsPath)) return res.json({ files: [] });
        const files = fs.readdirSync(uploadsPath);
        const fileDetails = files.map(file => ({
            name: file,
            url: `/uploads/${file}`
        }));
        res.json({ files: fileDetails });
    } catch (err) {
        res.status(500).json({ error: "Failed to list media" });
    }
};

// DELETE /api/database/media/:filename - Delete an uploaded media file
exports.deleteMedia = async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'public/uploads', filename);

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        // Security check: ensure the file is actually in the uploads directory
        const resolvedPath = path.resolve(filePath);
        const resolvedUploadsDir = path.resolve(path.join(process.cwd(), 'public/uploads'));

        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(403).json({ error: "Access denied" });
        }

        fs.unlinkSync(filePath);
        res.json({ success: true, message: "File deleted successfully" });
    } catch (err) {
        console.error("Delete media error:", err);
        res.status(500).json({ error: "Failed to delete media file" });
    }
};
