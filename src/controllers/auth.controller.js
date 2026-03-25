const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Tạo JWT token cho user.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới.
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Kiểm tra required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ thông tin (name, email, password)',
    });
  }

  // Kiểm tra email đã tồn tại chưa
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email đã được đăng ký',
    });
  }

  // Tạo user mới
  const user = await User.create({ name, email, password });

  // Tạo token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    data: {
      user: user.toJSON(),
      token,
    },
  });
};

/**
 * POST /api/auth/login
 * Đăng nhập → trả JWT.
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập email và mật khẩu',
    });
  }

  // Tìm user kèm password (vì default select: false)
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không đúng',
    });
  }

  // So sánh password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không đúng',
    });
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      user: user.toJSON(),
      token,
    },
  });
};

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại (cần auth).
 */
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
};

/**
 * PUT /api/auth/profile
 * Cập nhật thông tin cá nhân (tên, avatar).
 */
const updateProfile = async (req, res) => {
  const { name, avatar } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Tên phải có từ 2 đến 50 ký tự',
      });
    }
    updates.name = name.trim();
  }

  if (avatar !== undefined) {
    updates.avatar = avatar;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp thông tin cần cập nhật',
    });
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: 'Cập nhật thông tin thành công',
    data: { user },
  });
};

/**
 * PUT /api/auth/change-password
 * Đổi mật khẩu.
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
    });
  }

  // Lấy user kèm password
  const user = await User.findById(req.user._id).select('+password');

  // Kiểm tra mật khẩu hiện tại
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu hiện tại không đúng',
    });
  }

  user.password = newPassword;
  await user.save(); // Pre-save hook sẽ hash password

  res.json({
    success: true,
    message: 'Đổi mật khẩu thành công',
  });
};

module.exports = { register, login, getMe, updateProfile, changePassword };
