const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const Room = require('../models/Room');
const { getIO } = require('../sockets/socket');
const { createNotification } = require('./notification.controller');

// ─── Helper: tạo conversationId ─────────────────────────
const makeConvId = (a, b) => [a.toString(), b.toString()].sort().join('_');

/**
 * GET /api/dm/contacts
 * Lấy danh sách user mà current user có chung phòng (potential contacts).
 */
const getContacts = async (req, res) => {
  // Tìm tất cả phòng mà user thuộc về
  const rooms = await Room.find({ members: req.user._id })
    .select('members')
    .populate('members', 'name email avatar');

  // Gom các unique members (trừ chính mình)
  const contactMap = new Map();
  rooms.forEach(room => {
    room.members.forEach(m => {
      if (m._id.toString() !== req.user._id.toString()) {
        contactMap.set(m._id.toString(), {
          _id: m._id,
          name: m.name,
          email: m.email,
          avatar: m.avatar,
        });
      }
    });
  });

  const contacts = Array.from(contactMap.values());

  res.json({
    success: true,
    data: { contacts },
  });
};

/**
 * GET /api/dm/conversations
 * Lấy danh sách cuộc hội thoại DM (grouped by partner).
 */
const getConversations = async (req, res) => {
  // Lấy tất cả tin nhắn liên quan đến user
  const messages = await DirectMessage.aggregate([
    {
      $match: {
        $or: [
          { sender: req.user._id },
          { receiver: req.user._id },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', req.user._id] },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  // Populate partner info
  const conversations = await Promise.all(
    messages.map(async (conv) => {
      const msg = conv.lastMessage;
      const partnerId = msg.sender.toString() === req.user._id.toString()
        ? msg.receiver
        : msg.sender;

      const partner = await User.findById(partnerId).select('name email avatar');

      return {
        conversationId: conv._id,
        partner: partner ? {
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          avatar: partner.avatar,
        } : null,
        lastMessage: {
          content: msg.content,
          sender: msg.sender,
          createdAt: msg.createdAt,
        },
        unreadCount: conv.unreadCount,
      };
    })
  );

  res.json({
    success: true,
    data: { conversations },
  });
};

/**
 * GET /api/dm/messages/:partnerId
 * Lấy tin nhắn giữa current user và partner.
 */
const getMessages = async (req, res) => {
  const { partnerId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const conversationId = makeConvId(req.user._id, partnerId);

  const [messages, total] = await Promise.all([
    DirectMessage.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .lean(),
    DirectMessage.countDocuments({ conversationId }),
  ]);

  // Đánh dấu đã đọc tin nhắn từ partner
  await DirectMessage.updateMany(
    {
      conversationId,
      receiver: req.user._id,
      isRead: false,
    },
    { isRead: true, readAt: new Date() }
  );

  // Thông báo cho partner biết messages đã được đọc
  try {
    const io = getIO();
    io.to(`user_${partnerId}`).emit('dm_messages_read', {
      conversationId,
      readBy: req.user._id,
    });
  } catch {
    // Ignore
  }

  res.json({
    success: true,
    data: {
      messages: messages.reverse(), // Oldest first
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
 * POST /api/dm/send
 * Gửi tin nhắn DM.
 * Body: { receiverId, content }
 */
const sendMessage = async (req, res) => {
  const { receiverId, content } = req.body;

  if (!receiverId || !content?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp receiverId và nội dung tin nhắn',
    });
  }

  if (receiverId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Không thể gửi tin nhắn cho chính mình',
    });
  }

  // Check receiver exists
  const receiver = await User.findById(receiverId).select('name');
  if (!receiver) {
    return res.status(404).json({
      success: false,
      message: 'Người nhận không tồn tại',
    });
  }

  const conversationId = makeConvId(req.user._id, receiverId);

  const message = await DirectMessage.create({
    conversationId,
    sender: req.user._id,
    receiver: receiverId,
    content: content.trim(),
  });

  // Populate sender info for response
  await message.populate('sender', 'name avatar');
  await message.populate('receiver', 'name avatar');

  // Emit real-time via Socket.IO
  try {
    const io = getIO();

    const messageData = {
      _id: message._id,
      conversationId: message.conversationId,
      sender: message.sender,
      receiver: message.receiver,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt,
    };

    // Gửi cho receiver
    io.to(`user_${receiverId}`).emit('dm_new_message', messageData);

    // Gửi lại cho sender (để sync multiple tabs)
    io.to(`user_${req.user._id.toString()}`).emit('dm_new_message', messageData);
  } catch {
    // Ignore
  }

  // Tạo notification cho người nhận
  createNotification({
    userId: receiverId,
    type: 'system',
    title: 'Tin nhắn mới',
    message: `${req.user.name} đã gửi cho bạn một tin nhắn`,
    link: `/dm/${req.user._id}`,
    metadata: {
      actorName: req.user.name,
    },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    data: { message },
  });
};

/**
 * GET /api/dm/unread-total
 * Tổng số tin nhắn chưa đọc.
 */
const getUnreadTotal = async (req, res) => {
  const count = await DirectMessage.countDocuments({
    receiver: req.user._id,
    isRead: false,
  });

  res.json({
    success: true,
    data: { unreadCount: count },
  });
};

/**
 * PATCH /api/dm/read/:partnerId
 * Đánh dấu đã đọc tất cả tin từ partner.
 */
const markConversationRead = async (req, res) => {
  const { partnerId } = req.params;
  const conversationId = makeConvId(req.user._id, partnerId);

  await DirectMessage.updateMany(
    {
      conversationId,
      receiver: req.user._id,
      isRead: false,
    },
    { isRead: true, readAt: new Date() }
  );

  // Notify partner
  try {
    const io = getIO();
    io.to(`user_${partnerId}`).emit('dm_messages_read', {
      conversationId,
      readBy: req.user._id,
    });
  } catch {
    // Ignore
  }

  res.json({
    success: true,
    message: 'Đã đánh dấu đã đọc',
  });
};

module.exports = {
  getContacts,
  getConversations,
  getMessages,
  sendMessage,
  getUnreadTotal,
  markConversationRead,
};
