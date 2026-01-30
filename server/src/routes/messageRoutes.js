const router = require("express").Router();
const messageController = require("../controllers/messageController");
const { requireAuth, requirePageAccess } = require("../middleware/authMiddleware");
const multer = require('multer');
const path = require('path');

// Configure storage for message attachments
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

router.use(requireAuth);

// List pages assigned to current user
router.get("/pages", messageController.getMyPages);

// List conversations for a specific page (Access Checked)
router.get("/conversations", requirePageAccess, messageController.listConversations);

// Admin: List ALL conversations
router.get("/all_conversations", messageController.getAllConversations);

// Specific conversation details (Internal Access Check)
router.get('/:conversationId', requireAuth, requirePageAccess, messageController.getMessages);
router.post('/send', requireAuth, requirePageAccess, messageController.replyToMessage); // Alias for sender
router.post('/:conversationId/reply', requireAuth, requirePageAccess, messageController.replyToMessage);
router.put('/:conversationId/name', requireAuth, requirePageAccess, messageController.updateConversationName);
router.delete('/:conversationId/conversation', requireAuth, requirePageAccess, messageController.deleteConversation);
router.delete('/:conversationId/cleanup', requireAuth, requirePageAccess, messageController.deleteOlderMessages);
router.delete('/:conversationId/latest', requireAuth, requirePageAccess, messageController.deleteLatestMessage);
router.delete('/:id', requireAuth, messageController.deleteMessage); // Soft delete

// NEW: Mark as read
router.put('/:conversationId/read', requireAuth, requirePageAccess, messageController.markConversationAsRead);

// NEW: Upload image and send message
router.post('/:conversationId/upload', requireAuth, requirePageAccess, upload.single('image'), messageController.uploadImage);

module.exports = router;
