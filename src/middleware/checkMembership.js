const Room = require('../models/Room');

/**
 * Kiểm tra user có phải member của room không.
 * @param {string} roomId - ID phòng học
 * @param {string} userId - ID người dùng
 * @returns {Promise<Object>} room document nếu hợp lệ
 * @throws {Error} 404 nếu không tìm thấy phòng, 403 nếu không phải thành viên
 */
const checkRoomMembership = async (roomId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) {
    const err = new Error('Không tìm thấy phòng học');
    err.statusCode = 404;
    throw err;
  }

  const isMember = room.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );
  if (!isMember) {
    const err = new Error('Bạn không phải thành viên của phòng này');
    err.statusCode = 403;
    throw err;
  }

  return room;
};

module.exports = checkRoomMembership;
