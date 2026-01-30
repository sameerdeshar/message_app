const router = require("express").Router();
const databaseController = require("../controllers/databaseController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// All database routes require admin authentication
router.use(requireAuth);
// Media listing for all authenticated users
router.get("/media", databaseController.listMedia);

// All other database routes require admin authentication
router.use(requireAdmin);

// Table operations
router.get("/tables", databaseController.listTables);
router.get("/tables/:tableName/schema", databaseController.getTableSchema);
router.get("/tables/:tableName/data", databaseController.getTableData);

// CRUD operations
router.post("/tables/:tableName/insert", databaseController.insertRow);
router.put("/tables/:tableName/update", databaseController.updateRow);
router.delete("/tables/:tableName/delete", databaseController.deleteRow);

// Custom SQL query execution
router.post("/query", databaseController.executeQuery);

// Media deletion (Still Admin only)
router.delete("/media/:filename", databaseController.deleteMedia);

module.exports = router;
