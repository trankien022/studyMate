const mongoose = require('mongoose');

/**
 * DirectMessage Schema
 * Mỗi document là 1 tin nhắn riêng giữa 2 users.
 * "conversationId" là key tổng hợp gộp 2 userId (sort) để nhóm cuộc hội thoại.
 */
const directMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo conversationId từ 2 userId (sort để luôn nhất quán)
directMessageSchema.statics.getConversationId = function (userId1, userId2) {
  return [userId1.toString(), userId2.toString()].sort().join('_');
};

// Indexes
directMessageSchema.index({ conversationId: 1, createdAt: -1 });
directMessageSchema.index({ receiver: 1, isRead: 1 });
directMessageSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
