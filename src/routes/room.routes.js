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
} = require('../controllers/room.controller');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Tất cả room routes đều cần auth
router.use(auth);

router.post('/', asyncHandler(createRoom));
router.get('/', asyncHandler(getRooms));
router.post('/join', asyncHandler(joinRoom));
router.get('/:id', asyncHandler(getRoomById));
router.patch('/:id/notes', asyncHandler(updateNotes));
router.delete('/:id', asyncHandler(deleteRoom));
router.post('/:id/leave', asyncHandler(leaveRoom));
router.delete('/:id/members/:memberId', asyncHandler(kickMember));
router.patch('/:id/transfer', asyncHandler(transferOwnership));

module.exports = router;
