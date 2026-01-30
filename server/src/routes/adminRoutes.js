const router = require("express").Router();
const adminController = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// Apply middleware to all admin routes
router.use(requireAuth);

// Routes allowed for BOTH admins and agents (for self-access)
router.get("/assignments/user/:userId", (req, res, next) => {
    // Admins can see any user, agents can only see themselves
    if (req.session.role === 'admin' || parseInt(req.params.userId) === req.session.userId) {
        return next();
    }
    return res.status(403).json({ error: "Access denied. You can only view your own assignments." });
}, adminController.getUserAssignments);

// Only admins beyond this point
router.use(requireAdmin);

// Users
router.post("/users", adminController.createUser);
router.get("/users", adminController.listUsers);
router.delete("/users/:id", adminController.deleteUser);

// Pages
router.post("/pages", adminController.addPage);
router.get("/pages", adminController.listPages);
router.delete("/pages/:id", adminController.deletePage);

// Assignments
router.post("/assign", adminController.assignPage);
router.post("/assign/bulk", adminController.bulkAssignPages);
router.post("/unassign", adminController.unassignPage);
router.get("/assignments", adminController.listAssignments);

module.exports = router;
