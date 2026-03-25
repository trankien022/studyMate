const mongoose = require('mongoose');

// ─── Schema tin nhắn trong phiên tutor ─────────────────────
const tutorMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// ─── Schema phiên học với AI Tutor ─────────────────────────
const tutorSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Cấu hình cá nhân hóa
    subject: {
      type: String,
      required: [true, 'Môn học không được để trống'],
      trim: true,
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    learningStyle: {
      type: String,
      enum: ['visual', 'step-by-step', 'examples', 'socratic'],
      default: 'step-by-step',
    },
    // Trạng thái phiên
    title: {
      type: String,
      default: '',
      trim: true,
    },
    messages: [tutorMessageSchema],
    // Theo dõi tiến trình
    conceptsCovered: {
      type: [String],
      default: [],
    },
    masteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    questionsAsked: {
      type: Number,
      default: 0,
    },
    questionsCorrect: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh theo userId
tutorSessionSchema.index({ userId: 1, updatedAt: -1 });
tutorSessionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('TutorSession', tutorSessionSchema);
