const express = require('express');
const router = express.Router();
const UserNote = require('../models/UserNote');
const { isAdmin, isAgent } = require('../middleware/authMiddleware');

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

/**
 * @route   GET /api/notes/:customerId
 * @desc    Get note for a customer
 * @access  Agent/Admin
 */
router.get('/:customerId', isAuthenticated, async (req, res) => {
    try {
        const note = await UserNote.findByCustomerId(req.params.customerId);
        res.json(note || { content: '' });
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/notes/:customerId
 * @desc    Create or update note for a customer
 * @access  Agent/Admin
 */
router.post('/:customerId', isAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        const customerId = req.params.customerId;
        const userId = req.session.userId;

        if (content === undefined) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const note = await UserNote.upsert({
            customerId,
            content,
            last_edited_by: userId
        });

        res.json(note);
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   DELETE /api/notes/:customerId
 * @desc    Delete note for a customer
 * @access  Agent/Admin
 */
router.delete('/:customerId', isAuthenticated, async (req, res) => {
    try {
        const success = await UserNote.delete(req.params.customerId);
        if (success) {
            res.json({ message: 'Note deleted successfully' });
        } else {
            res.status(404).json({ error: 'Note not found' });
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
