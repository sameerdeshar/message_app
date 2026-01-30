const router = require("express").Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/check", authController.checkAuth);
router.get("/me", authController.checkAuth); // Alias for session check
router.put("/fcm-token", requireAuth, authController.updateFCMToken);

module.exports = router;
