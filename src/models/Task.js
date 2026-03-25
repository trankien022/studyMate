const mongoose = require('mongoose');

// ─── Task Schema — Kanban Board cho phòng học ───────────────
const taskSchema = new mongoose.Schema(
  {
    // Tiêu đề công việc
    title: {
      type: String,
      required: [true, 'Tiêu đề công việc không được để trống'],
      trim: true,
      minlength: [2, 'Tiêu đề phải có ít nhất 2 ký tự'],
      maxlength: [200, 'Tiêu đề không được quá 200 ký tự'],
    },

    // Mô tả chi tiết (tuỳ chọn)
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Mô tả không được quá 2000 ký tự'],
    },

    // Phòng học chứa task
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Phòng học không được để trống'],
    },

    // Người tạo task
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Danh sách thành viên được gán
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Trạng thái Kanban
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo',
    },

    // Độ ưu tiên
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Deadline (tuỳ chọn)
    deadline: {
      type: Date,
      default: null,
    },

    // Thứ tự hiển thị trong cột Kanban
    order: {
      type: Number,
      default: 0,
    },

    // Nhãn/tag (tuỳ chọn)
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ─── Index để query nhanh theo phòng ────────────────────────
taskSchema.index({ roomId: 1, status: 1, order: 1 });

// ─── Instance methods ───────────────────────────────────────
taskSchema.methods.isCreatedBy = function (userId) {
  return this.createdBy.toString() === userId.toString();
};

taskSchema.methods.isAssignedTo = function (userId) {
  return this.assignees.some(
    (assigneeId) => assigneeId.toString() === userId.toString()
  );
};

// ─── Loại bỏ __v khi chuyển JSON ───────────────────────────
taskSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Task', taskSchema);
