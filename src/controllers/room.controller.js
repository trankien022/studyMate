const Room = require('../models/Room');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const checkRoomMembership = require('../middleware/checkMembership');
const { createBulkNotifications, createNotification } = require('./notification.controller');
const { triggerBadgeCheck } = require('./badge.controller');

/**
 * POST /api/rooms
 * Tạo phòng học mới. Owner tự động là thành viên đầu tiên.
 */
const createRoom = async (req, res) => {
  const { name, subject } = req.body;

  if (!name || !subject) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tên phòng và môn học',
    });
  }

  // Validate subject length
  if (subject.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Tên môn học không được quá 100 ký tự',
    });
  }

  const room = await Room.create({
    name,
    subject,
    owner: req.user._id,
    members: [req.user._id], // Owner là thành viên đầu tiên
  });

  // 🏆 Kiểm tra huy hiệu mới
  triggerBadgeCheck(req.user._id);

  res.status(201).json({
    success: true,
    message: 'Tạo phòng học thành công',
    data: { room },
  });
};

/**
 * GET /api/rooms
 * Lấy danh sách phòng mà user là thành viên.
 */
const getRooms = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;

  const total = await Room.countDocuments({ members: req.user._id });

  const rooms = await Room.find({ members: req.user._id })
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    data: {
      rooms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * GET /api/rooms/:id
 * Lấy chi tiết phòng (chỉ thành viên mới xem được).
 */
const getRoomById = async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar');

  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Kiểm tra user có phải là thành viên không
  const isMember = room.members.some(
    (member) => member._id.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không phải thành viên của phòng này',
    });
  }

  res.json({
    success: true,
    data: { room },
  });
};

/**
 * POST /api/rooms/join
 * Tham gia phòng bằng inviteCode.
 */
const joinRoom = async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập mã mời',
    });
  }

  // Validate inviteCode format (8 hex characters)
  if (!/^[A-Fa-f0-9]{8}$/.test(inviteCode.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Mã mời không đúng định dạng (8 ký tự)',
    });
  }

  const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Mã mời không hợp lệ',
    });
  }

  // Kiểm tra đã là thành viên chưa
  const isAlreadyMember = room.members.some(
    (memberId) => memberId.toString() === req.user._id.toString()
  );
  if (isAlreadyMember) {
    return res.status(400).json({
      success: false,
      message: 'Bạn đã là thành viên của phòng này',
    });
  }

  room.members.push(req.user._id);
  await room.save();

  // Populate để trả về data đầy đủ
  await room.populate('owner', 'name email avatar');
  await room.populate('members', 'name email avatar');

  // 🔔 Thông báo cho các thành viên khác
  const otherMembers = room.members
    .filter(m => m._id.toString() !== req.user._id.toString())
    .map(m => m._id);

  if (otherMembers.length > 0) {
    createBulkNotifications(otherMembers, {
      type: 'member_joined',
      title: 'Thành viên mới',
      message: `${req.user.name} đã tham gia phòng "${room.name}"`,
      link: `/room/${room._id}`,
      metadata: {
        roomId: room._id,
        roomName: room.name,
        actorName: req.user.name,
      },
    }).catch(err => console.error('[Notification] Error:', err.message));
  }

  // 🏆 Kiểm tra huy hiệu mới
  triggerBadgeCheck(req.user._id);

  res.json({
    success: true,
    message: 'Tham gia phòng thành công',
    data: { room },
  });
};

/**
 * PATCH /api/rooms/:id/notes
 * Cập nhật ghi chú phòng (chỉ thành viên mới được cập nhật).
 */
const updateNotes = async (req, res) => {
  const { notes } = req.body;

  if (notes === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp nội dung ghi chú',
    });
  }

  const room = await Room.findById(req.params.id);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Kiểm tra quyền
  const isMember = room.members.some(
    (memberId) => memberId.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không phải thành viên của phòng này',
    });
  }

  room.notes = notes;
  await room.save();

  res.json({
    success: true,
    message: 'Cập nhật ghi chú thành công',
    data: { room },
  });
};

/**
 * DELETE /api/rooms/:id
 * Xóa phòng học (chỉ owner mới được xóa).
 */
const deleteRoom = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Chỉ owner mới được xóa
  if (room.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ chủ phòng mới có thể xóa phòng',
    });
  }

  // 🔔 Thông báo cho các thành viên (trừ owner)
  const otherMembers = room.members
    .filter(mid => mid.toString() !== req.user._id.toString());

  if (otherMembers.length > 0) {
    createBulkNotifications(otherMembers, {
      type: 'room_deleted',
      title: 'Phòng đã bị xóa',
      message: `Phòng "${room.name}" đã bị xóa bởi chủ phòng ${req.user.name}`,
      link: '/dashboard',
      metadata: {
        roomName: room.name,
        actorName: req.user.name,
      },
    }).catch(err => console.error('[Notification] Error:', err.message));
  }

  // Xóa tất cả data liên quan
  const quizzes = await Quiz.find({ roomId: room._id });
  const quizIds = quizzes.map((q) => q._id);

  await Promise.all([
    Quiz.deleteMany({ roomId: room._id }),
    QuizResult.deleteMany({ quizId: { $in: quizIds } }),
    Conversation.deleteMany({ roomId: room._id }),
    Notification.deleteMany({ 'metadata.roomId': room._id }),
    Room.findByIdAndDelete(room._id),
  ]);

  res.json({
    success: true,
    message: 'Đã xóa phòng học và toàn bộ dữ liệu liên quan',
  });
};

/**
 * POST /api/rooms/:id/leave
 * Rời phòng học (member rời, owner không được rời).
 */
const leaveRoom = async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('members', 'name');
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Kiểm tra có phải thành viên không
  const memberIndex = room.members.findIndex(
    (member) => member._id.toString() === req.user._id.toString()
  );
  if (memberIndex === -1) {
    return res.status(400).json({
      success: false,
      message: 'Bạn không phải thành viên của phòng này',
    });
  }

  // Owner không được rời (phải xóa phòng hoặc chuyển quyền)
  if (room.owner.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Chủ phòng không thể rời phòng. Hãy xóa phòng hoặc chuyển quyền.',
    });
  }

  room.members.splice(memberIndex, 1);
  await room.save();

  // 🔔 Thông báo cho các thành viên còn lại
  const remainingMembers = room.members
    .filter(m => m._id.toString() !== req.user._id.toString())
    .map(m => m._id);

  if (remainingMembers.length > 0) {
    createBulkNotifications(remainingMembers, {
      type: 'member_left',
      title: 'Thành viên rời phòng',
      message: `${req.user.name} đã rời khỏi phòng "${room.name}"`,
      link: `/room/${room._id}`,
      metadata: {
        roomId: room._id,
        roomName: room.name,
        actorName: req.user.name,
      },
    }).catch(err => console.error('[Notification] Error:', err.message));
  }

  res.json({
    success: true,
    message: 'Đã rời khỏi phòng học',
  });
};

/**
 * DELETE /api/rooms/:id/members/:memberId
 * Kick member (chỉ owner mới có quyền).
 */
const kickMember = async (req, res) => {
  const { id, memberId } = req.params;

  const room = await Room.findById(id);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Chức năng này chỉ dành cho owner
  if (room.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ chủ phòng mới có quyền xóa thành viên',
    });
  }

  // Không thể tự kick chính mình (nên dùng leaveRoom)
  if (memberId.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Bạn không thể tự đuổi chính mình',
    });
  }

  const memberIndex = room.members.findIndex(
    (mid) => mid.toString() === memberId.toString()
  );

  if (memberIndex === -1) {
    return res.status(400).json({
      success: false,
      message: 'Người dùng không phải là thành viên trong phòng này',
    });
  }

  room.members.splice(memberIndex, 1);
  await room.save();

  // 🔔 Thông báo cho người bị kick
  createNotification({
    userId: memberId,
    type: 'member_kicked',
    title: 'Bị đuổi khỏi phòng',
    message: `Bạn đã bị đuổi khỏi phòng "${room.name}" bởi chủ phòng`,
    link: '/dashboard',
    metadata: {
      roomName: room.name,
      actorName: req.user.name,
    },
  }).catch(err => console.error('[Notification] Error:', err.message));

  res.json({
    success: true,
    message: 'Đã xóa thành viên khỏi phòng',
  });
};

/**
 * PATCH /api/rooms/:id/transfer
 * Transfer ownership cho một member khác (chỉ owner hiện tại mới có quyền).
 */
const transferOwnership = async (req, res) => {
  const { id } = req.params;
  const { newOwnerId } = req.body;

  if (!newOwnerId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp newOwnerId',
    });
  }

  const room = await Room.findById(id);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Chức năng này chỉ dành cho owner
  if (room.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ chủ phòng mới có quyền chuyển đổi chủ sở hữu',
    });
  }

  if (newOwnerId.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Bạn đang là chủ phòng rồi',
    });
  }

  const memberExists = room.members.some(
    (mid) => mid.toString() === newOwnerId.toString()
  );

  if (!memberExists) {
    return res.status(400).json({
      success: false,
      message: 'Người dùng mới chưa là thành viên của phòng',
    });
  }

  room.owner = newOwnerId;
  await room.save();

  // 🔔 Thông báo cho chủ phòng mới
  createNotification({
    userId: newOwnerId,
    type: 'ownership_transfer',
    title: 'Bạn là chủ phòng mới!',
    message: `${req.user.name} đã chuyển quyền chủ phòng "${room.name}" cho bạn`,
    link: `/room/${room._id}`,
    metadata: {
      roomId: room._id,
      roomName: room.name,
      actorName: req.user.name,
    },
  }).catch(err => console.error('[Notification] Error:', err.message));

  res.json({
    success: true,
    message: 'Chuyển quyền chủ phòng thành công',
  });
};

// ─── Public Room Discovery ─────────────────────────────

/**
 * GET /api/rooms/discover
 * Duyệt và tìm kiếm phòng công khai.
 * Query params: search, subject, sortBy (members|newest|name), page, limit
 */
const discoverPublicRooms = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;
  const { search, subject, sortBy } = req.query;

  // Xây dựng filter — chỉ phòng công khai
  const filter = { isPublic: true };

  // Tìm kiếm theo tên hoặc môn học
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { subject: searchRegex },
      { description: searchRegex },
    ];
  }

  // Lọc theo môn học cụ thể
  if (subject && subject.trim()) {
    filter.subject = new RegExp(`^${subject.trim()}$`, 'i');
  }

  // Xác định sắp xếp
  let sort = {};
  switch (sortBy) {
    case 'members':
      sort = { memberCount: -1, updatedAt: -1 };
      break;
    case 'name':
      sort = { name: 1 };
      break;
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'newest':
    default:
      sort = { createdAt: -1 };
      break;
  }

  // Đếm tổng kết quả
  const total = await Room.countDocuments(filter);

  // Lấy danh sách phòng
  let rooms = await Room.find(filter)
    .populate('owner', 'name avatar')
    .populate('members', 'name avatar')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  // Nếu sort theo members, thêm memberCount để sort
  if (sortBy === 'members') {
    rooms = rooms.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
  }

  // Đánh dấu phòng mà user hiện tại đã tham gia
  const userId = req.user._id.toString();
  rooms = rooms.map(room => ({
    ...room,
    memberCount: room.members?.length || 0,
    isMember: room.members?.some(m => m._id.toString() === userId) || false,
    isOwner: room.owner?._id?.toString() === userId,
    // Ẩn inviteCode trong kết quả tìm kiếm
    inviteCode: undefined,
    // Ẩn notes trong kết quả tìm kiếm
    notes: undefined,
  }));

  // Lấy danh sách môn học unique cho filter
  const subjects = await Room.distinct('subject', { isPublic: true });

  res.json({
    success: true,
    data: {
      rooms,
      subjects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * POST /api/rooms/:id/join-public
 * Tham gia phòng công khai trực tiếp (không cần mã mời).
 */
const joinPublicRoom = async (req, res) => {
  const { id } = req.params;

  const room = await Room.findById(id);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Chỉ cho phép tham gia phòng công khai
  if (!room.isPublic) {
    return res.status(403).json({
      success: false,
      message: 'Phòng này không phải phòng công khai',
    });
  }

  // Kiểm tra đã là thành viên chưa
  const isAlreadyMember = room.members.some(
    (memberId) => memberId.toString() === req.user._id.toString()
  );
  if (isAlreadyMember) {
    return res.status(400).json({
      success: false,
      message: 'Bạn đã là thành viên của phòng này',
    });
  }

  room.members.push(req.user._id);
  await room.save();

  // Populate để trả về data đầy đủ
  await room.populate('owner', 'name email avatar');
  await room.populate('members', 'name email avatar');

  // 🔔 Thông báo cho các thành viên khác
  const otherMembers = room.members
    .filter(m => m._id.toString() !== req.user._id.toString())
    .map(m => m._id);

  if (otherMembers.length > 0) {
    createBulkNotifications(otherMembers, {
      type: 'member_joined',
      title: 'Thành viên mới',
      message: `${req.user.name} đã tham gia phòng "${room.name}" qua khám phá`,
      link: `/room/${room._id}`,
      metadata: {
        roomId: room._id,
        roomName: room.name,
        actorName: req.user.name,
      },
    }).catch(err => console.error('[Notification] Error:', err.message));
  }

  // 🏆 Kiểm tra huy hiệu mới
  triggerBadgeCheck(req.user._id);

  res.json({
    success: true,
    message: 'Tham gia phòng thành công',
    data: { room },
  });
};

/**
 * PATCH /api/rooms/:id/public
 * Bật/tắt chế độ công khai cho phòng (chỉ owner).
 */
const togglePublicRoom = async (req, res) => {
  const { id } = req.params;
  const { isPublic, description } = req.body;

  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp trạng thái isPublic (true/false)',
    });
  }

  const room = await Room.findById(id);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phòng học',
    });
  }

  // Chỉ owner mới có quyền
  if (room.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ chủ phòng mới có thể thay đổi chế độ công khai',
    });
  }

  room.isPublic = isPublic;
  if (description !== undefined) {
    room.description = description;
  }
  await room.save();

  res.json({
    success: true,
    message: isPublic ? 'Phòng đã được công khai' : 'Phòng đã chuyển sang riêng tư',
    data: { room },
  });
};

module.exports = {
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
};
