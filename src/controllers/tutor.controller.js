const TutorSession = require('../models/TutorSession');
const aiService = require('../services/aiService');

// ─── Constants ──────────────────────────────────────────────
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_STYLES = ['visual', 'step-by-step', 'examples', 'socratic'];
const MAX_MESSAGE_LENGTH = 5000;

/**
 * POST /api/tutor/sessions
 * Tạo phiên học mới với AI Tutor.
 * Body: { subject, topic?, difficulty?, learningStyle? }
 */
const createSession = async (req, res) => {
  const { subject, topic, difficulty, learningStyle } = req.body;

  // Validate input
  if (!subject || !subject.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập môn học',
    });
  }

  if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({
      success: false,
      message: `Mức độ không hợp lệ. Chọn: ${VALID_DIFFICULTIES.join(', ')}`,
    });
  }

  if (learningStyle && !VALID_STYLES.includes(learningStyle)) {
    return res.status(400).json({
      success: false,
      message: `Phong cách học không hợp lệ. Chọn: ${VALID_STYLES.join(', ')}`,
    });
  }

  // Tạo phiên mới
  const session = new TutorSession({
    userId: req.user._id,
    subject: subject.trim(),
    topic: topic?.trim() || '',
    difficulty: difficulty || 'intermediate',
    learningStyle: learningStyle || 'step-by-step',
    title: `${subject.trim()}${topic ? ` - ${topic.trim()}` : ''}`,
    messages: [],
  });

  await session.save();

  res.status(201).json({
    success: true,
    message: 'Đã tạo phiên học mới',
    data: { session },
  });
};

/**
 * GET /api/tutor/sessions
 * Lấy danh sách phiên học của user.
 * Query: ?status=active&page=1&limit=10
 */
const getSessions = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status;
  const skip = (page - 1) * limit;

  // Build query filter
  const filter = { userId: req.user._id };
  if (status && ['active', 'completed', 'archived'].includes(status)) {
    filter.status = status;
  }

  const total = await TutorSession.countDocuments(filter);

  const sessions = await TutorSession.find(filter)
    .select('subject topic difficulty learningStyle title status masteryLevel questionsAsked questionsCorrect conceptsCovered createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Thêm thông tin tóm tắt cho mỗi session
  const sessionsWithMeta = sessions.map((s) => ({
    ...s,
    messageCount: undefined, // Không cần trả messages array
    lastActivity: s.updatedAt,
  }));

  res.json({
    success: true,
    data: {
      sessions: sessionsWithMeta,
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
 * GET /api/tutor/sessions/:id
 * Lấy chi tiết phiên học (bao gồm messages).
 */
const getSession = async (req, res) => {
  const session = await TutorSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phiên học',
    });
  }

  res.json({
    success: true,
    data: { session },
  });
};

/**
 * POST /api/tutor/sessions/:id/chat
 * Gửi tin nhắn trong phiên học với AI Tutor.
 * Body: { message }
 */
const chatInSession = async (req, res) => {
  const { message } = req.body;

  // Validate message
  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập tin nhắn',
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Tin nhắn không được quá ${MAX_MESSAGE_LENGTH} ký tự`,
    });
  }

  // Tìm phiên học
  const session = await TutorSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phiên học',
    });
  }

  if (session.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Phiên học đã kết thúc. Hãy tạo phiên mới.',
    });
  }

  // Lấy history (tối đa 20 tin gần nhất)
  const history = session.messages.slice(-20).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Gọi AI Tutor
  const config = {
    subject: session.subject,
    topic: session.topic,
    difficulty: session.difficulty,
    learningStyle: session.learningStyle,
  };

  const aiResponse = await aiService.tutorChat(message.trim(), config, history);

  // Lưu cả user message và AI response
  session.messages.push(
    { role: 'user', content: message.trim() },
    { role: 'assistant', content: aiResponse }
  );

  // Cập nhật số câu hỏi (đếm messages user gửi)
  session.questionsAsked = session.messages.filter((m) => m.role === 'user').length;

  // Cập nhật title nếu là tin nhắn đầu tiên
  if (session.messages.length === 2 && !session.title) {
    session.title = message.substring(0, 60) + (message.length > 60 ? '...' : '');
  }

  await session.save();

  res.json({
    success: true,
    data: {
      message: {
        role: 'assistant',
        content: aiResponse,
      },
      questionsAsked: session.questionsAsked,
    },
  });
};

/**
 * PATCH /api/tutor/sessions/:id/config
 * Cập nhật cấu hình cá nhân hóa (difficulty, learningStyle, topic).
 * Body: { difficulty?, learningStyle?, topic? }
 */
const updateConfig = async (req, res) => {
  const { difficulty, learningStyle, topic } = req.body;

  const session = await TutorSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phiên học',
    });
  }

  if (difficulty) {
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: `Mức độ không hợp lệ. Chọn: ${VALID_DIFFICULTIES.join(', ')}`,
      });
    }
    session.difficulty = difficulty;
  }

  if (learningStyle) {
    if (!VALID_STYLES.includes(learningStyle)) {
      return res.status(400).json({
        success: false,
        message: `Phong cách không hợp lệ. Chọn: ${VALID_STYLES.join(', ')}`,
      });
    }
    session.learningStyle = learningStyle;
  }

  if (topic !== undefined) {
    session.topic = topic.trim();
  }

  await session.save();

  res.json({
    success: true,
    message: 'Đã cập nhật cấu hình',
    data: {
      difficulty: session.difficulty,
      learningStyle: session.learningStyle,
      topic: session.topic,
    },
  });
};

/**
 * POST /api/tutor/sessions/:id/complete
 * Kết thúc phiên học và tạo báo cáo tóm tắt bằng AI.
 */
const completeSession = async (req, res) => {
  const session = await TutorSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phiên học',
    });
  }

  if (session.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Phiên học đã được kết thúc trước đó',
    });
  }

  // Phân tích phiên học bằng AI (nếu có đủ messages)
  let summary = null;
  if (session.messages.length >= 4) {
    summary = await aiService.generateTutorSummary({
      subject: session.subject,
      topic: session.topic,
      messages: session.messages,
      questionsAsked: session.questionsAsked,
      questionsCorrect: session.questionsCorrect,
    });

    // Cập nhật session với kết quả phân tích
    session.conceptsCovered = summary.conceptsCovered;
    session.masteryLevel = summary.masteryLevel;
  }

  session.status = 'completed';
  await session.save();

  res.json({
    success: true,
    message: 'Đã kết thúc phiên học',
    data: {
      session: {
        _id: session._id,
        status: session.status,
        masteryLevel: session.masteryLevel,
        conceptsCovered: session.conceptsCovered,
        questionsAsked: session.questionsAsked,
      },
      summary,
    },
  });
};

/**
 * DELETE /api/tutor/sessions/:id
 * Xóa phiên học.
 */
const deleteSession = async (req, res) => {
  const session = await TutorSession.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy phiên học',
    });
  }

  await TutorSession.findByIdAndDelete(session._id);

  res.json({
    success: true,
    message: 'Đã xóa phiên học',
  });
};

/**
 * GET /api/tutor/stats
 * Thống kê tổng quan tiến trình học của user.
 */
const getStats = async (req, res) => {
  const userId = req.user._id;

  const [totalSessions, activeSessions, completedSessions] = await Promise.all([
    TutorSession.countDocuments({ userId }),
    TutorSession.countDocuments({ userId, status: 'active' }),
    TutorSession.countDocuments({ userId, status: 'completed' }),
  ]);

  // Lấy average mastery từ completed sessions
  const masteryAgg = await TutorSession.aggregate([
    { $match: { userId, status: 'completed', masteryLevel: { $gt: 0 } } },
    { $group: { _id: null, avgMastery: { $avg: '$masteryLevel' }, totalQuestions: { $sum: '$questionsAsked' } } },
  ]);

  // Lấy top subjects
  const subjectAgg = await TutorSession.aggregate([
    { $match: { userId } },
    { $group: { _id: '$subject', count: { $sum: 1 }, avgMastery: { $avg: '$masteryLevel' } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Lấy recent sessions
  const recentSessions = await TutorSession.find({ userId })
    .select('subject topic title masteryLevel status updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  res.json({
    success: true,
    data: {
      stats: {
        totalSessions,
        activeSessions,
        completedSessions,
        avgMastery: masteryAgg[0]?.avgMastery ? Math.round(masteryAgg[0].avgMastery) : 0,
        totalQuestions: masteryAgg[0]?.totalQuestions || 0,
      },
      topSubjects: subjectAgg.map((s) => ({
        subject: s._id,
        sessionCount: s.count,
        avgMastery: Math.round(s.avgMastery || 0),
      })),
      recentSessions,
    },
  });
};

module.exports = {
  createSession,
  getSessions,
  getSession,
  chatInSession,
  updateConfig,
  completeSession,
  deleteSession,
  getStats,
};
