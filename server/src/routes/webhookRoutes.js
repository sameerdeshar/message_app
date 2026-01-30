const router = require("express").Router();
const webhookController = require("../controllers/webhookController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", webhookController.verifyWebhook);
router.post("/", webhookController.handleWebhookEvent);

module.exports = router;
