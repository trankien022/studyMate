const express = require('express');
const router = express.Router();
const {
  getContacts,
  getConversations,
  getMessages,
  sendMessage,
  getUnreadTotal,
  markConversationRead,
} = require('../controllers/dm.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Tất cả DM routes đều cần auth
router.use(auth);

router.get('/contacts', asyncHandler(getContacts));
router.get('/conversations', asyncHandler(getConversations));
router.get('/unread-total', asyncHandler(getUnreadTotal));
router.get('/messages/:partnerId', asyncHandler(getMessages));
router.post('/send', asyncHandler(sendMessage));
router.patch('/read/:partnerId', asyncHandler(markConversationRead));

module.exports = router;
