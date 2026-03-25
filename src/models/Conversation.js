const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant'],
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Mỗi message có createdAt riêng
  }
);

const conversationSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'Cuộc trò chuyện mới',
      trim: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh theo roomId + userId
conversationSchema.index({ roomId: 1, userId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
