const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { aiRateLimiter } = require('../middleware/rateLimit');
const {
  upload,
  fixOriginalName,
  uploadDocument,
  retryExtraction,
  getDocuments,
  getDocumentDetail,
  analyzeDocument,
  askAboutDocument,
  deleteDocument,
} = require('../controllers/document.controller');

// Tất cả routes cần authentication
router.use(auth);

// Upload tài liệu (multipart/form-data) — fixOriginalName sửa encoding tên file VN
router.post('/upload', upload.single('file'), fixOriginalName, asyncHandler(uploadDocument));

// Lấy danh sách tài liệu trong phòng
router.get('/:roomId', asyncHandler(getDocuments));

// Lấy chi tiết tài liệu
router.get('/detail/:id', asyncHandler(getDocumentDetail));

// Thử lại trích xuất text (cho documents bị lỗi)
router.post('/:id/retry', asyncHandler(retryExtraction));

// Phân tích tài liệu bằng AI
router.post('/:id/analyze', aiRateLimiter, asyncHandler(analyzeDocument));

// Hỏi đáp về tài liệu
router.post('/:id/ask', aiRateLimiter, asyncHandler(askAboutDocument));

// Xóa tài liệu
router.delete('/:id', asyncHandler(deleteDocument));

module.exports = router;
