const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'quiz_created',      // Quiz mới được tạo trong phòng
        'member_joined',     // Thành viên mới tham gia phòng
        'member_left',       // Thành viên rời phòng
        'member_kicked',     // Bị đuổi khỏi phòng
        'room_deleted',      // Phòng bị xóa
        'ownership_transfer',// Chuyển quyền chủ phòng
        'quiz_result',       // Có người nộp quiz
        'system',            // Thông báo hệ thống
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // Link để navigate khi click notification
    link: {
      type: String,
      default: '',
    },
    // Metadata bổ sung (roomId, quizId, etc.)
    metadata: {
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
      roomName: String,
      quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
      actorName: String, // Người gây ra notification
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index cho query hiệu quả
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
