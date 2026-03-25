const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 1,
    },
    answers: {
      type: [Number],
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Mỗi user chỉ nộp 1 lần cho mỗi quiz
quizResultSchema.index({ quizId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('QuizResult', quizResultSchema);
