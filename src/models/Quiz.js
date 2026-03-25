const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length === 4,
      message: 'Mỗi câu hỏi phải có đúng 4 đáp án',
    },
  },
  correctIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  explanation: {
    type: String,
    default: '',
  },
});

const quizSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    topic: {
      type: String,
      required: [true, 'Chủ đề quiz không được để trống'],
      trim: true,
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (v) => v.length >= 1 && v.length <= 20,
        message: 'Quiz phải có từ 1 đến 20 câu hỏi',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh theo roomId
quizSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
