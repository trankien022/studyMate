const express = require('express');
const router = express.Router();
const {
  chatWithAI,
  summarizeText,
  getChatHistory,
  getConversation,
  deleteConversation,
  explainQuiz,
  getStudySuggestions,
} = require('../controllers/ai.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const { aiRateLimiter } = require('../middleware/rateLimit');

// Tất cả AI routes đều cần auth
router.use(auth);

router.post('/chat', aiRateLimiter, asyncHandler(chatWithAI));
router.post('/summarize', aiRateLimiter, asyncHandler(summarizeText));
router.get('/history/:roomId', asyncHandler(getChatHistory));
router.get('/conversation/:id', asyncHandler(getConversation));
router.delete('/conversation/:id', asyncHandler(deleteConversation));
router.post('/explain-quiz', aiRateLimiter, asyncHandler(explainQuiz));
router.get('/study-suggestions', aiRateLimiter, asyncHandler(getStudySuggestions));

module.exports = router;
