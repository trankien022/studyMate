const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Tên file không được để trống'],
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Nội dung text đã trích xuất từ file
    extractedText: {
      type: String,
      default: '',
    },
    // Kết quả phân tích AI
    analysis: {
      summary: { type: String, default: '' },
      keyPoints: [{ type: String }],
      suggestedQuizTopics: [{ type: String }],
      analyzedAt: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ['uploaded', 'extracting', 'extracted', 'analyzing', 'analyzed', 'error'],
      default: 'uploaded',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index: tìm documents theo room nhanh
documentSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
