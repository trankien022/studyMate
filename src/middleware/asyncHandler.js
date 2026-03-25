/**
 * Wrapper bọc async route handlers.
 * Tự catch error và chuyển sang error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
