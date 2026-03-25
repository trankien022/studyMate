const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    orderInfo: {
      type: String,
      default: 'Nang cap Premium AI StudyMate',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    vnpayTransactionNo: {
      type: String,
      default: '',
    },
    bankCode: {
      type: String,
      default: '',
    },
    payDate: {
      type: String,
      default: '',
    },
    premiumDays: {
      type: Number,
      default: 30,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
