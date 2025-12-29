const express = require('express');
const router = express.Router();
const {
  submitContact,
  getMessages,
  toggleReadStatus,
  deleteMessage
} = require('../controllers/contactController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   POST /contact/submit
// @desc    Submit contact form
// @access  Public
router.post('/submit', submitContact);

// Admin Routes - Require authentication and admin role
router.use(protect);
router.use(isAdmin);

// @route   GET /contact/messages
// @desc    Get all contact messages
router.get('/messages', getMessages);

// @route   PUT /contact/mark-read/:id
// @desc    Mark message as read/unread
router.put('/mark-read/:id', toggleReadStatus);

// @route   DELETE /contact/:id
// @desc    Delete message
router.delete('/:id', deleteMessage);

module.exports = router;
