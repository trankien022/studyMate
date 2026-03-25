const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  avatarUpload,
  changePassword,
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Public routes
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

// Protected routes
router.get('/me', auth, asyncHandler(getMe));
router.put('/profile', auth, asyncHandler(updateProfile));
router.post('/avatar', auth, avatarUpload.single('avatar'), asyncHandler(uploadAvatar));
router.delete('/avatar', auth, asyncHandler(removeAvatar));
router.put('/change-password', auth, asyncHandler(changePassword));

module.exports = router;
