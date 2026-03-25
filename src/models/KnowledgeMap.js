const mongoose = require('mongoose');

// ─── Schema cho từng node kiến thức ─────────────────────────
const knowledgeNodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'ID node không được để trống'],
  },
  label: {
    type: String,
    required: [true, 'Tên khái niệm không được để trống'],
    trim: true,
    maxlength: [100, 'Tên khái niệm không được quá 100 ký tự'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Mô tả không được quá 500 ký tự'],
  },
  category: {
    type: String,
    default: 'concept',
    enum: ['concept', 'theory', 'formula', 'definition', 'example', 'application'],
  },
  mastery: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  // Vị trí trên canvas (x, y)
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  // Nguồn gốc node (AI tự tạo hay user thêm)
  source: {
    type: String,
    default: 'ai',
    enum: ['ai', 'manual'],
  },
});

// ─── Schema cho cạnh (edge) nối giữa 2 nodes ────────────────
const knowledgeEdgeSchema = new mongoose.Schema({
  source: {
    type: String,
    required: [true, 'Source node không được để trống'],
  },
  target: {
    type: String,
    required: [true, 'Target node không được để trống'],
  },
  label: {
    type: String,
    default: '',
    maxlength: [80, 'Label không được quá 80 ký tự'],
  },
  strength: {
    type: Number,
    default: 1,
    min: 0,
    max: 1,
  },
});

// ─── Schema chính: Knowledge Map ─────────────────────────────
const knowledgeMapSchema = new mongoose.Schema(
  {
    // Map thuộc về room hoặc cá nhân
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề bản đồ không được để trống'],
      trim: true,
      maxlength: [150, 'Tiêu đề không được quá 150 ký tự'],
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    nodes: [knowledgeNodeSchema],
    edges: [knowledgeEdgeSchema],
    // Phân tích lỗ hổng kiến thức từ AI
    gaps: [
      {
        topic: String,
        severity: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
        suggestion: String,
      },
    ],
    // Thống kê tổng quan
    stats: {
      totalNodes: { type: Number, default: 0 },
      totalEdges: { type: Number, default: 0 },
      averageMastery: { type: Number, default: 0 },
      lastAnalyzedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Index để truy vấn nhanh theo user và room
knowledgeMapSchema.index({ userId: 1, roomId: 1 });
knowledgeMapSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeMap', knowledgeMapSchema);
