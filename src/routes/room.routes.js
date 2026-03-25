const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom,
  updateNotes,
  deleteRoom,
  leaveRoom,
  kickMember,
  transferOwnership,
  discoverPublicRooms,
  joinPublicRoom,
  togglePublicRoom,
} = require('../controllers/room.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Tất cả room routes đều cần auth
router.use(auth);

// ─── Public Room Discovery (đặt TRƯỚC /:id) ───────────
router.get('/discover', asyncHandler(discoverPublicRooms));

router.post('/', asyncHandler(createRoom));
router.get('/', asyncHandler(getRooms));
router.post('/join', asyncHandler(joinRoom));
router.get('/:id', asyncHandler(getRoomById));
router.patch('/:id/notes', asyncHandler(updateNotes));
router.delete('/:id', asyncHandler(deleteRoom));
router.post('/:id/leave', asyncHandler(leaveRoom));
router.delete('/:id/members/:memberId', asyncHandler(kickMember));
router.patch('/:id/transfer', asyncHandler(transferOwnership));
router.post('/:id/join-public', asyncHandler(joinPublicRoom));
router.patch('/:id/public', asyncHandler(togglePublicRoom));

module.exports = router;

