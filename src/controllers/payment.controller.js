const crypto = require('crypto');
const qs = require('qs');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Helper: Sắp xếp object theo tên key (a-z)
 * COPY NGUYÊN VĂN từ demo NodeJS chính thức của VNPay
 * https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * QUAN TRỌNG: Hàm này encode cả key lẫn value, và thay %20 bằng +
 * Đây là yêu cầu bắt buộc của VNPay để tạo chữ ký đúng.
 */
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[decodeURIComponent(str[key])]).replace(/%20/g, '+');
  }
  return sorted;
}

/**
 * Helper: Format date yyyyMMddHHmmss theo timezone VN (GMT+7)
 */
function formatVnDate(date) {
  // Chuyển sang giờ Vietnam (UTC+7)
  const vnOffset = 7 * 60; // phút
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnDate = new Date(utc + vnOffset * 60000);

  const pad = (n) => String(n).padStart(2, '0');
  return (
    vnDate.getFullYear().toString() +
    pad(vnDate.getMonth() + 1) +
    pad(vnDate.getDate()) +
    pad(vnDate.getHours()) +
    pad(vnDate.getMinutes()) +
    pad(vnDate.getSeconds())
  );
}

/**
 * POST /api/payment/create-url
 * Tạo URL thanh toán VNPay — THEO ĐÚNG DEMO NODEJS CHÍNH THỨC
 *
 * Luồng theo tài liệu:
 * 1. Build vnp_Params object (tất cả value phải là string/number nguyên thủy)
 * 2. Sort params theo key (a-z) bằng hàm sortObject (đã encode sẵn)
 * 3. signData = qs.stringify(sortedParams, { encode: false })
 * 4. HMAC-SHA512(secretKey, signData) => vnp_SecureHash
 * 5. Append SecureHash vào URL (encode: false vì đã encode trong sortObject)
 */
exports.createPaymentUrl = async (req, res) => {
  try {
    const { amount = 99000, bankCode = '', language = 'vn' } = req.body;
    const userId = req.user._id;

    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    let vnpUrl = process.env.VNPAY_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    // Validate cấu hình
    if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
      return res.status(500).json({
        success: false,
        message: 'Thiếu cấu hình VNPay. Vui lòng kiểm tra biến môi trường.',
      });
    }

    // Log config để debug
    console.log('[VNPay] tmnCode:', tmnCode);
    console.log('[VNPay] secretKey length:', secretKey.length);
    console.log('[VNPay] vnpUrl:', vnpUrl);
    console.log('[VNPay] returnUrl:', returnUrl);

    // Lấy IP client — PHẢI là IPv4
    let ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    // Normalize IPv6 loopback → IPv4
    if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
      ipAddr = '127.0.0.1';
    }
    // Xử lý ::ffff: prefix (IPv4-mapped IPv6)
    if (ipAddr.startsWith('::ffff:')) {
      ipAddr = ipAddr.replace('::ffff:', '');
    }
    // Nếu có nhiều IP (x-forwarded-for), lấy IP đầu tiên
    if (ipAddr.includes(',')) {
      ipAddr = ipAddr.split(',')[0].trim();
    }

    const date = new Date();
    const createDate = formatVnDate(date);
    const orderId = `SM${Date.now()}`;

    // Tính ngày hết hạn thanh toán (15 phút)
    const expireDate = formatVnDate(new Date(date.getTime() + 15 * 60 * 1000));

    // Lưu order vào DB
    await Order.create({
      userId,
      orderId,
      amount,
      orderInfo: 'Nang cap Premium AI StudyMate',
      status: 'pending',
    });

    // ═══════════════════════════════════════════════════════
    //  BUILD VNPAY PARAMS — CHÍNH XÁC THEO DEMO NODEJS
    //  Tất cả value đều PHẢI là kiểu nguyên thủy (string/number)
    // ═══════════════════════════════════════════════════════
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = language || 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = 'Nang cap Premium AI StudyMate';
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100; // VNPay demo cũng dùng number ở đây
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = expireDate;

    if (bankCode !== null && bankCode !== '') {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    // ═══════════════════════════════════════
    //  SORT + ENCODE (hàm sortObject của VNPay)
    //  Sau bước này, tất cả key và value đã được encodeURIComponent
    // ═══════════════════════════════════════
    vnp_Params = sortObject(vnp_Params);

    // ═══════════════════════════════════════
    //  TẠO CHỮ KÝ (SIGNATURE)
    //  signData = stringify với encode:false (vì sortObject đã encode rồi)
    // ═══════════════════════════════════════
    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    // ═══════════════════════════════════════
    //  BUILD URL CUỐI CÙNG
    //  encode:false vì sortObject đã encode tất cả rồi
    //  (đúng theo code demo VNPay NodeJS)
    // ═══════════════════════════════════════
    vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

    console.log('[VNPay] createDate:', createDate);
    console.log('[VNPay] ipAddr:', ipAddr);
    console.log('[VNPay] signData:', signData);
    console.log('[VNPay] signed:', signed);
    console.log('[VNPay] fullUrl:', vnpUrl);

    res.json({
      success: true,
      data: { paymentUrl: vnpUrl, orderId },
    });
  } catch (error) {
    console.error('Create payment URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo URL thanh toán',
    });
  }
};

/**
 * GET /api/payment/vnpay-ipn
 * VNPay gọi server-to-server để xác nhận thanh toán
 *
 * THEO ĐÚNG DEMO NODEJS:
 * 1. Lấy query params
 * 2. Tách ra vnp_SecureHash
 * 3. Delete vnp_SecureHash, vnp_SecureHashType
 * 4. Sort lại params
 * 5. signData = qs.stringify(sorted, { encode: false })
 * 6. So sánh secureHash === signed
 * 7. Kiểm tra order + amount + status
 * 8. Trả về RspCode + Message
 */
exports.vnpayIPN = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNPAY_HASH_SECRET;
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    console.log('[VNPay IPN] signData:', signData);
    console.log('[VNPay IPN] computed:', signed);
    console.log('[VNPay IPN] received:', secureHash);

    if (secureHash !== signed) {
      console.log('[VNPay IPN] ❌ Invalid signature');
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    // Signature hợp lệ — xử lý order
    const orderId = vnp_Params['vnp_TxnRef'];
    const rspCode = vnp_Params['vnp_ResponseCode'];
    const transactionNo = vnp_Params['vnp_TransactionNo'];
    const bankCode = vnp_Params['vnp_BankCode'];
    const payDate = vnp_Params['vnp_PayDate'];
    const vnpAmount = parseInt(vnp_Params['vnp_Amount']) / 100;

    // Decode orderId vì sortObject đã encode
    const decodedOrderId = decodeURIComponent(orderId);

    // Tìm order trong DB
    const order = await Order.findOne({ orderId: decodedOrderId });
    if (!order) {
      console.log('[VNPay IPN] ❌ Order not found:', decodedOrderId);
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền
    if (order.amount !== vnpAmount) {
      console.log('[VNPay IPN] ❌ Invalid amount:', order.amount, '!==', vnpAmount);
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Kiểm tra đã xử lý chưa
    if (order.status !== 'pending') {
      console.log('[VNPay IPN] ⚠️ Order already confirmed:', decodedOrderId);
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // Cập nhật order
    order.vnpayTransactionNo = transactionNo ? decodeURIComponent(transactionNo) : '';
    order.bankCode = bankCode ? decodeURIComponent(bankCode) : '';
    order.payDate = payDate ? decodeURIComponent(payDate) : '';

    if (rspCode === '00') {
      order.status = 'success';
      await order.save();

      // Cập nhật premium cho user
      const user = await User.findById(order.userId);
      if (user) {
        const now = new Date();
        const currentExpiry =
          user.premiumExpiry && user.premiumExpiry > now ? user.premiumExpiry : now;
        user.isPremium = true;
        user.premiumExpiry = new Date(
          currentExpiry.getTime() + order.premiumDays * 24 * 60 * 60 * 1000
        );
        await user.save();
        console.log('[VNPay IPN] ✅ User upgraded to premium:', user._id);
      }
    } else {
      order.status = 'failed';
      await order.save();
      console.log('[VNPay IPN] ❌ Payment failed with code:', rspCode);
    }

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('VNPay IPN error:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

/**
 * GET /api/payment/vnpay-return
 * Redirect user về frontend với kết quả
 *
 * LƯU Ý: Trong môi trường dev (localhost), VNPay IPN không thể gọi được server.
 * Nên logic xử lý order + upgrade premium cũng được thực hiện ở đây
 * để đảm bảo hoạt động đúng khi phát triển.
 * Trong production, nên dùng IPN làm nguồn chính và return chỉ redirect.
 */
exports.vnpayReturn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNPAY_HASH_SECRET;
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const responseCode = vnp_Params['vnp_ResponseCode'] || '';

    console.log('[VNPay Return] isValid:', isValid, '| responseCode:', responseCode);

    // ═══════════════════════════════════════════════════════
    //  XỬ LÝ ORDER + UPGRADE PREMIUM (fallback cho IPN)
    //  Chỉ xử lý khi signature hợp lệ và thanh toán thành công
    // ═══════════════════════════════════════════════════════
    if (isValid && responseCode === '00') {
      const orderId = decodeURIComponent(vnp_Params['vnp_TxnRef'] || '');
      const transactionNo = vnp_Params['vnp_TransactionNo']
        ? decodeURIComponent(vnp_Params['vnp_TransactionNo'])
        : '';
      const bankCode = vnp_Params['vnp_BankCode']
        ? decodeURIComponent(vnp_Params['vnp_BankCode'])
        : '';
      const payDate = vnp_Params['vnp_PayDate']
        ? decodeURIComponent(vnp_Params['vnp_PayDate'])
        : '';

      const order = await Order.findOne({ orderId });
      if (order && order.status === 'pending') {
        order.status = 'success';
        order.vnpayTransactionNo = transactionNo;
        order.bankCode = bankCode;
        order.payDate = payDate;
        await order.save();

        // Upgrade user lên Premium
        const user = await User.findById(order.userId);
        if (user) {
          const now = new Date();
          const currentExpiry =
            user.premiumExpiry && user.premiumExpiry > now ? user.premiumExpiry : now;
          user.isPremium = true;
          user.premiumExpiry = new Date(
            currentExpiry.getTime() + order.premiumDays * 24 * 60 * 60 * 1000
          );
          await user.save();
          console.log('[VNPay Return] ✅ User upgraded to premium:', user._id);
        }

        console.log('[VNPay Return] ✅ Order updated:', orderId);
      } else if (order) {
        console.log('[VNPay Return] ⚠️ Order already processed:', orderId);
      }
    }

    // Redirect về frontend với query params
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectParams = new URLSearchParams({
      vnp_ResponseCode: decodeURIComponent(responseCode),
      vnp_TxnRef: decodeURIComponent(vnp_Params['vnp_TxnRef'] || ''),
      vnp_Amount: decodeURIComponent(vnp_Params['vnp_Amount'] || ''),
      vnp_TransactionNo: decodeURIComponent(vnp_Params['vnp_TransactionNo'] || ''),
      vnp_BankCode: decodeURIComponent(vnp_Params['vnp_BankCode'] || ''),
      isValid: isValid.toString(),
    });

    res.redirect(`${frontendUrl}/payment/vnpay-return?${redirectParams.toString()}`);
  } catch (error) {
    console.error('VNPay return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment/vnpay-return?vnp_ResponseCode=99&isValid=false`);
  }
};

/**
 * GET /api/payment/history
 * Lấy lịch sử giao dịch của user
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(20).lean();

    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy lịch sử thanh toán',
    });
  }
};
