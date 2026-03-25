const mongoose = require('mongoose');
const crypto = require('crypto');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên phòng không được để trống'],
      trim: true,
      minlength: [2, 'Tên phòng phải có ít nhất 2 ký tự'],
      maxlength: [100, 'Tên phòng không được quá 100 ký tự'],
    },
    subject: {
      type: String,
      required: [true, 'Môn học không được để trống'],
      trim: true,
    },
    inviteCode: {
      type: String,
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Mô tả phòng không được quá 500 ký tự'],
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Tự tạo inviteCode trước khi save (nếu chưa có)
roomSchema.pre('save', function () {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
});

module.exports = mongoose.model('Room', roomSchema);
