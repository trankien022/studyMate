const Notification = require('../models/Notification');
const { getIO } = require('../sockets/socket');

// ─── Helper: Tạo và gửi notification real-time ──────────────
const createNotification = async ({ userId, type, title, message, link, metadata }) => {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    link: link || '',
    metadata: metadata || {},
  });

  // Emit real-time qua Socket.IO
  try {
    const io = getIO();
    io.to(`user_${userId.toString()}`).emit('new_notification', {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      metadata: notification.metadata,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    console.error('[Notification] Socket emit error:', err.message);
  }

  return notification;
};

// ─── Helper: Gửi notification cho nhiều users ──────────────
const createBulkNotifications = async (userIds, { type, title, message, link, metadata }) => {
  const notifications = userIds.map(userId => ({
    userId,
    type,
    title,
    message,
    link: link || '',
    metadata: metadata || {},
  }));

  const created = await Notification.insertMany(notifications);

  // Emit real-time cho từng user
  try {
    const io = getIO();
    created.forEach(n => {
      io.to(`user_${n.userId.toString()}`).emit('new_notification', {
        _id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        metadata: n.metadata,
        isRead: n.isRead,
        createdAt: n.createdAt,
      });
    });
  } catch (err) {
    console.error('[Notification] Bulk socket emit error:', err.message);
  }

  return created;
};

// ─── GET /api/notifications ─────────────────────────────────
const getNotifications = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId: req.user._id }),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

// ─── GET /api/notifications/unread-count ────────────────────
const getUnreadCount = async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.json({
    success: true,
    data: { unreadCount },
  });
};

// ─── PATCH /api/notifications/:id/read ──────────────────────
const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông báo',
    });
  }

  res.json({
    success: true,
    data: { notification },
  });
};

// ─── PATCH /api/notifications/read-all ──────────────────────
const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({
    success: true,
    message: 'Đã đánh dấu tất cả đã đọc',
  });
};

// ─── DELETE /api/notifications/:id ──────────────────────────
const deleteNotification = async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thông báo',
    });
  }

  res.json({
    success: true,
    message: 'Đã xóa thông báo',
  });
};

// ─── DELETE /api/notifications (clear all) ──────────────────
const clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });

  res.json({
    success: true,
    message: 'Đã xóa tất cả thông báo',
  });
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
