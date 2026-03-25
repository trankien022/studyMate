const User = require('../models/User');

/**
 * Middleware kiểm tra user có Premium active không.
 * Dùng bọc các API chỉ dành cho Premium.
 */
const checkPremium = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại',
      });
    }

    if (!user.isPremiumActive()) {
      return res.status(403).json({
        success: false,
        message: 'Tính năng này chỉ dành cho tài khoản Premium. Vui lòng nâng cấp để sử dụng.',
        code: 'PREMIUM_REQUIRED',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkPremium;
