const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Public routes
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

// Protected routes
router.get('/me', auth, asyncHandler(getMe));
router.put('/profile', auth, asyncHandler(updateProfile));
router.put('/change-password', auth, asyncHandler(changePassword));

module.exports = router;
