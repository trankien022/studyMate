const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Document = require('../models/Document');
const checkRoomMembership = require('../middleware/checkMembership');
const aiService = require('../services/aiService');

// ─── Multer Configuration ────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Tạo thư mục uploads nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// Fix encoding tên file tiếng Việt — multer decode originalname bằng latin1 mặc định
const fixOriginalName = (req, res, next) => {
  if (req.file && req.file.originalname) {
    req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  }
  next();
};

// Chỉ chấp nhận các file text-based
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedExts = ['.txt', '.md', '.pdf', '.csv', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ hỗ trợ file .txt, .md, .pdf, .csv, .docx'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// ─── Text Extraction ─────────────────────────────────────────

/**
 * Trích xuất text từ file dựa vào loại file.
 * Có timeout 30s để tránh trường hợp pdf-parse bị treo.
 * @param {string} filePath - Đường dẫn file
 * @param {string} mimeType - MIME type
 * @returns {string} Nội dung text
 */
const extractText = async (filePath, mimeType) => {
  const ext = path.extname(filePath).toLowerCase();

  // Plain text / Markdown / CSV
  if (['.txt', '.md', '.csv'].includes(ext) || mimeType.startsWith('text/')) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // PDF — dùng pdf-parse với timeout protection
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);

    // Wrap trong Promise.race để timeout nếu lib bị treo
    const pdfPromise = pdfParse(dataBuffer);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PDF parse timeout sau 30 giây')), 30000)
    );

    const data = await Promise.race([pdfPromise, timeoutPromise]);
    return data.text || '[Không trích xuất được text từ PDF]';
  }

  // DOCX — giải nén ZIP, đọc XML, strip tags
  if (ext === '.docx') {
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(filePath);
      const content = zip.readAsText('word/document.xml');
      // Strip XML tags, normalize whitespace
      const text = content
        .replace(/<w:p[^>]*>/g, '\n')        // Paragraph breaks
        .replace(/<w:tab\/>/g, '\t')          // Tabs
        .replace(/<[^>]+>/g, '')              // Remove all XML tags
        .replace(/&amp;/g, '&')              // Decode entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/[ \t]+/g, ' ')             // Normalize spaces (keep newlines)
        .replace(/\n{3,}/g, '\n\n')          // Max 2 newlines
        .trim();
      return text || '[File DOCX trống]';
    } catch (err) {
      console.error('[Document] DOCX extraction error:', err.message);
      return '[Không thể đọc nội dung file DOCX]';
    }
  }

  return '[Định dạng file không được hỗ trợ trích xuất text]';
};

// ─── Controllers ─────────────────────────────────────────────

/**
 * POST /api/documents/upload
 * Upload tài liệu vào phòng học.
 * Form-data: file (binary), roomId (text)
 */
const uploadDocument = async (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp roomId',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn file tài liệu',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  // Tạo document record
  const doc = await Document.create({
    originalName: req.file.originalname,
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    roomId,
    uploadedBy: req.user._id,
    status: 'extracting',
  });

  // Trích xuất text (async, không block response)
  const filePath = path.join(UPLOAD_DIR, req.file.filename);
  extractText(filePath, req.file.mimetype)
    .then(async (text) => {
      doc.extractedText = text;
      doc.status = 'extracted';
      await doc.save();
      console.log(`[Document] Extracted text from "${doc.originalName}" (${text.length} chars)`);
    })
    .catch(async (err) => {
      console.error(`[Document] Extraction error for "${doc.originalName}":`, err.message);
      doc.status = 'error';
      doc.errorMessage = err.message || 'Lỗi trích xuất text';
      await doc.save();
    });

  // Populate uploadedBy cho response
  await doc.populate('uploadedBy', 'name email avatar');

  res.status(201).json({
    success: true,
    message: 'Upload tài liệu thành công',
    data: { document: doc },
  });
};

/**
 * POST /api/documents/:id/retry
 * Thử lại trích xuất text cho document bị lỗi.
 */
const retryExtraction = async (req, res) => {
  const doc = await Document.findById(req.params.id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài liệu',
    });
  }

  await checkRoomMembership(doc.roomId, req.user._id);

  if (doc.status !== 'error' && doc.status !== 'uploaded') {
    return res.status(400).json({
      success: false,
      message: 'Tài liệu không cần thử lại',
    });
  }

  const filePath = path.join(UPLOAD_DIR, doc.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File gốc không còn tồn tại trên server',
    });
  }

  doc.status = 'extracting';
  doc.errorMessage = '';
  await doc.save();

  // Trích xuất lại (async)
  extractText(filePath, doc.mimeType)
    .then(async (text) => {
      doc.extractedText = text;
      doc.status = 'extracted';
      await doc.save();
      console.log(`[Document] Re-extracted text from "${doc.originalName}" (${text.length} chars)`);
    })
    .catch(async (err) => {
      console.error(`[Document] Retry error for "${doc.originalName}":`, err.message);
      doc.status = 'error';
      doc.errorMessage = err.message || 'Lỗi trích xuất text';
      await doc.save();
    });

  res.json({
    success: true,
    message: 'Đang thử lại trích xuất tài liệu...',
  });
};

/**
 * GET /api/documents/:roomId
 * Lấy danh sách tài liệu trong phòng.
 */
const getDocuments = async (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  const total = await Document.countDocuments({ roomId });

  const documents = await Document.find({ roomId })
    .populate('uploadedBy', 'name email avatar')
    .select('-extractedText') // Không trả text lớn trong list
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    data: {
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * GET /api/documents/detail/:id
 * Lấy chi tiết tài liệu (bao gồm extracted text).
 */
const getDocumentDetail = async (req, res) => {
  const doc = await Document.findById(req.params.id)
    .populate('uploadedBy', 'name email avatar');

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài liệu',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(doc.roomId, req.user._id);

  res.json({
    success: true,
    data: { document: doc },
  });
};

/**
 * POST /api/documents/:id/analyze
 * Phân tích tài liệu bằng AI (tóm tắt + key points + quiz topics).
 */
const analyzeDocument = async (req, res) => {
  const doc = await Document.findById(req.params.id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài liệu',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(doc.roomId, req.user._id);

  // Kiểm tra đã trích xuất text chưa
  if (!doc.extractedText || doc.status === 'extracting') {
    return res.status(400).json({
      success: false,
      message: 'Tài liệu đang được xử lý, vui lòng chờ',
    });
  }

  if (doc.extractedText.length < 50) {
    return res.status(400).json({
      success: false,
      message: 'Nội dung tài liệu quá ngắn để phân tích (tối thiểu 50 ký tự)',
    });
  }

  // Cập nhật status
  doc.status = 'analyzing';
  await doc.save();

  // Gọi AI phân tích
  try {
    const analysis = await aiService.analyzeDocument(doc.extractedText, doc.originalName);

    doc.analysis = {
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      suggestedQuizTopics: analysis.suggestedQuizTopics,
      analyzedAt: new Date(),
    };
    doc.status = 'analyzed';
    await doc.save();

    res.json({
      success: true,
      message: 'Phân tích tài liệu thành công',
      data: { analysis: doc.analysis },
    });
  } catch (err) {
    doc.status = 'extracted'; // Reset về extracted để user thử lại
    doc.errorMessage = err.message;
    await doc.save();

    res.status(502).json({
      success: false,
      message: 'Lỗi khi phân tích tài liệu, vui lòng thử lại',
    });
  }
};

/**
 * POST /api/documents/:id/ask
 * Hỏi đáp về nội dung tài liệu bằng AI.
 * Body: { question, history? }
 */
const askAboutDocument = async (req, res) => {
  const { question, history } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập câu hỏi',
    });
  }

  if (question.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Câu hỏi không được quá 2000 ký tự',
    });
  }

  const doc = await Document.findById(req.params.id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài liệu',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(doc.roomId, req.user._id);

  if (!doc.extractedText || doc.extractedText.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Tài liệu chưa được trích xuất nội dung',
    });
  }

  const answer = await aiService.askAboutDocument(
    doc.extractedText,
    question,
    history || []
  );

  res.json({
    success: true,
    data: { answer },
  });
};

/**
 * DELETE /api/documents/:id
 * Xóa tài liệu (chỉ người upload hoặc chủ phòng).
 */
const deleteDocument = async (req, res) => {
  const doc = await Document.findById(req.params.id);

  if (!doc) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài liệu',
    });
  }

  // Kiểm tra membership
  const room = await checkRoomMembership(doc.roomId, req.user._id);

  // Chỉ người upload hoặc owner phòng được xóa
  const isUploader = doc.uploadedBy.toString() === req.user._id.toString();
  const isOwner = room.owner.toString() === req.user._id.toString();

  if (!isUploader && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người upload hoặc chủ phòng mới có thể xóa tài liệu',
    });
  }

  // Xóa file khỏi disk
  const filePath = path.join(UPLOAD_DIR, doc.fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await Document.findByIdAndDelete(doc._id);

  res.json({
    success: true,
    message: 'Đã xóa tài liệu thành công',
  });
};

module.exports = {
  upload, // multer instance cho route
  fixOriginalName, // middleware sửa encoding tên file
  uploadDocument,
  retryExtraction,
  getDocuments,
  getDocumentDetail,
  analyzeDocument,
  askAboutDocument,
  deleteDocument,
};
