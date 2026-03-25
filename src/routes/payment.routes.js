const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createPaymentUrl,
  vnpayIPN,
  vnpayReturn,
  getPaymentHistory,
} = require('../controllers/payment.controller');

// Tạo URL thanh toán (cần đăng nhập)
router.post('/create-url', auth, createPaymentUrl);

// VNPay IPN callback — server-to-server (KHÔNG cần auth)
router.get('/vnpay-ipn', vnpayIPN);

// VNPay Return — redirect user về frontend (KHÔNG cần auth)
router.get('/vnpay-return', vnpayReturn);

// Lịch sử thanh toán (cần đăng nhập)
router.get('/history', auth, getPaymentHistory);

module.exports = router;
