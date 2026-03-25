const express = require('express');
const router = express.Router();
const {
  generateQuiz,
  getQuizzesByRoom,
  getQuizDetail,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
} = require('../controllers/quiz.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const { aiRateLimiter } = require('../middleware/rateLimit');

// Tất cả quiz routes đều cần auth
router.use(auth);

router.post('/generate', aiRateLimiter, asyncHandler(generateQuiz));
router.get('/detail/:id', asyncHandler(getQuizDetail));
router.post('/:id/submit', asyncHandler(submitQuiz));
router.get('/:id/results', asyncHandler(getQuizResults));
router.delete('/:id', asyncHandler(deleteQuiz));
router.get('/:roomId', asyncHandler(getQuizzesByRoom));

module.exports = router;
