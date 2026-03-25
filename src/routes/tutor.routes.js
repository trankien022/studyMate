const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSession,
  chatInSession,
  updateConfig,
  completeSession,
  deleteSession,
  getStats,
} = require('../controllers/tutor.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { aiRateLimiter } = require('../middleware/rateLimit');

// Tất cả tutor routes đều cần auth
router.use(auth);

// ─── Statistics ─────────────────────────────────────────────
router.get('/stats', asyncHandler(getStats));

// ─── Sessions CRUD ──────────────────────────────────────────
router.post('/sessions', asyncHandler(createSession));
router.get('/sessions', asyncHandler(getSessions));
router.get('/sessions/:id', asyncHandler(getSession));
router.delete('/sessions/:id', asyncHandler(deleteSession));

// ─── Session Actions ────────────────────────────────────────
router.post('/sessions/:id/chat', aiRateLimiter, asyncHandler(chatInSession));
router.patch('/sessions/:id/config', asyncHandler(updateConfig));
router.post('/sessions/:id/complete', aiRateLimiter, asyncHandler(completeSession));

module.exports = router;
