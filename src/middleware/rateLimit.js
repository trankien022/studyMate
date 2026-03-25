const rateLimit = require('express-rate-limit');

// Limit AI requests (e.g. 5 requests per 10 minutes)
const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 10, // Limit each IP to 10 requests per window
  message: {
    success: false,
    message: 'Bạn đã đạt giới hạn yêu cầu AI. Vui lòng thử lại sau 10 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  aiRateLimiter,
};
