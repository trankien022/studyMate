const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllBadges,
  getRecentBadges,
  checkAndUpdateBadges,
} = require('../controllers/badge.controller');

// Tất cả routes cần authentication
router.use(auth);

router.get('/', getAllBadges);
router.get('/recent', getRecentBadges);
router.post('/check', checkAndUpdateBadges);

module.exports = router;
