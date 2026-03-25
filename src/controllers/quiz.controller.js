const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const checkRoomMembership = require('../middleware/checkMembership');
const aiService = require('../services/aiService');
const { getIO } = require('../sockets/socket');

/**
 * POST /api/quiz/generate
 * AI tạo bộ quiz từ chủ đề.
 * Body: { roomId, topic, count? }
 */
const generateQuiz = async (req, res) => {
  const { roomId, topic, count } = req.body;

  if (!roomId || !topic) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp roomId và topic (chủ đề)',
    });
  }

  // Validate topic length
  if (topic.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Chủ đề quiz phải có ít nhất 2 ký tự',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  // Giới hạn số câu
  const questionCount = Math.min(Math.max(count || 5, 1), 15);

  // Gọi AI tạo quiz
  const questions = await aiService.generateQuiz(topic, questionCount);

  // Lưu quiz vào DB
  const quiz = await Quiz.create({
    roomId,
    topic,
    questions,
    createdBy: req.user._id,
  });

  // Thông báo qua socket
  try {
    const io = getIO();
    io.to(roomId.toString()).emit('quiz_created', { 
      topic: quiz.topic, 
      user: req.user.name || 'Một thành viên' 
    });
  } catch (err) {
    console.error('Socket emit error:', err);
  }

  res.status(201).json({
    success: true,
    message: `Đã tạo quiz "${topic}" với ${questions.length} câu hỏi`,
    data: {
      quiz: {
        _id: quiz._id,
        topic: quiz.topic,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt,
      },
    },
  });
};

/**
 * GET /api/quiz/:roomId
 * Lấy danh sách quiz của phòng.
 */
const getQuizzesByRoom = async (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const skip = (page - 1) * limit;

  await checkRoomMembership(roomId, req.user._id);

  const total = await Quiz.countDocuments({ roomId });

  const quizzes = await Quiz.find({ roomId })
    .select('topic questions createdBy createdAt')
    .populate('createdBy', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Trả về danh sách quiz kèm số câu (không kèm chi tiết câu hỏi)
  const quizList = quizzes.map((q) => ({
    _id: q._id,
    topic: q.topic,
    questionCount: q.questions.length,
    createdBy: q.createdBy,
    createdAt: q.createdAt,
  }));

  res.json({
    success: true,
    data: {
      quizzes: quizList,
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
 * GET /api/quiz/detail/:id
 * Lấy chi tiết quiz (câu hỏi + options, KHÔNG kèm đáp án đúng).
 */
const getQuizDetail = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id)
    .populate('createdBy', 'name avatar');

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy quiz',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(quiz.roomId, req.user._id);

  // Kiểm tra user đã làm quiz chưa
  const existingResult = await QuizResult.findOne({
    quizId: quiz._id,
    userId: req.user._id,
  });

  // Nếu chưa làm → ẩn đáp án đúng + explanation
  const questions = quiz.questions.map((q, i) => ({
    index: i,
    question: q.question,
    options: q.options,
    // Chỉ trả lời đáp án nếu đã submit
    ...(existingResult && {
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }),
  }));

  res.json({
    success: true,
    data: {
      quiz: {
        _id: quiz._id,
        topic: quiz.topic,
        questionCount: quiz.questions.length,
        createdBy: quiz.createdBy,
        createdAt: quiz.createdAt,
        questions,
      },
      submitted: !!existingResult,
      result: existingResult || null,
    },
  });
};

/**
 * POST /api/quiz/:id/submit
 * Nộp bài quiz.
 * Body: { answers: [0, 1, 2, 3, ...] }
 */
const submitQuiz = async (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp mảng answers',
    });
  }

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy quiz',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(quiz.roomId, req.user._id);

  // Kiểm tra đã nộp chưa
  const existing = await QuizResult.findOne({
    quizId: quiz._id,
    userId: req.user._id,
  });
  if (existing) {
    // Nếu có rồi thì xóa cái cũ đi để lưu cái mới
    await QuizResult.findByIdAndDelete(existing._id);
  }

  // Kiểm tra số lượng câu trả lời
  if (answers.length !== quiz.questions.length) {
    return res.status(400).json({
      success: false,
      message: `Quiz có ${quiz.questions.length} câu, bạn gửi ${answers.length} câu trả lời`,
    });
  }

  // Validate mỗi câu trả lời phải là số 0-3
  const invalidAnswer = answers.find((a) => typeof a !== 'number' || a < 0 || a > 3);
  if (invalidAnswer !== undefined) {
    return res.status(400).json({
      success: false,
      message: 'Mỗi câu trả lời phải là số từ 0 đến 3',
    });
  }

  // Chấm điểm
  let score = 0;
  const details = quiz.questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) score++;
    return {
      question: q.question,
      yourAnswer: answers[i],
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  // Lưu kết quả
  const result = await QuizResult.create({
    quizId: quiz._id,
    userId: req.user._id,
    score,
    total: quiz.questions.length,
    answers,
  });

  res.status(201).json({
    success: true,
    message: `Bạn đạt ${score}/${quiz.questions.length} câu đúng`,
    data: {
      result: {
        _id: result._id,
        score: result.score,
        total: result.total,
        percentage: Math.round((score / quiz.questions.length) * 100),
      },
      details,
    },
  });
};

/**
 * GET /api/quiz/:id/results
 * Kết quả quiz của mọi người trong phòng.
 */
const getQuizResults = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy quiz',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(quiz.roomId, req.user._id);

  const results = await QuizResult.find({ quizId: quiz._id })
    .populate('userId', 'name avatar')
    .sort({ score: -1 }); // Xếp hạng theo điểm giảm dần

  const leaderboard = results.map((r, i) => ({
    rank: i + 1,
    user: r.userId,
    score: r.score,
    total: r.total,
    percentage: Math.round((r.score / r.total) * 100),
    submittedAt: r.submittedAt,
  }));

  res.json({
    success: true,
    data: {
      quiz: { _id: quiz._id, topic: quiz.topic },
      leaderboard,
      totalParticipants: leaderboard.length,
    },
  });
};

/**
 * DELETE /api/quiz/:id
 * Xóa quiz (chỉ người tạo hoặc owner phòng mới được xóa).
 */
const deleteQuiz = async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy quiz',
    });
  }

  // Kiểm tra membership
  const room = await checkRoomMembership(quiz.roomId, req.user._id);

  // Chỉ người tạo quiz hoặc owner phòng mới được xóa
  const isCreator = quiz.createdBy.toString() === req.user._id.toString();
  const isOwner = room.owner.toString() === req.user._id.toString();
  if (!isCreator && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người tạo quiz hoặc chủ phòng mới có thể xóa',
    });
  }

  // Xóa quiz và các kết quả liên quan
  await Promise.all([
    Quiz.findByIdAndDelete(quiz._id),
    QuizResult.deleteMany({ quizId: quiz._id }),
  ]);

  res.json({
    success: true,
    message: 'Đã xóa quiz và kết quả liên quan',
  });
};

/**
 * GET /api/quiz/analytics/:roomId
 * Thống kê học tập của phòng.
 */
const getQuizAnalytics = async (req, res) => {
  const { roomId } = req.params;

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  // Tổng quiz trong phòng
  const totalQuizzes = await Quiz.countDocuments({ roomId });

  // Tổng lần làm bài
  const quizIds = await Quiz.find({ roomId }).select('_id topic');
  const quizIdList = quizIds.map((q) => q._id);

  const totalAttempts = await QuizResult.countDocuments({ quizId: { $in: quizIdList } });

  // Điểm trung bình
  const avgResult = await QuizResult.aggregate([
    { $match: { quizId: { $in: quizIdList } } },
    {
      $group: {
        _id: null,
        avgPercentage: { $avg: { $multiply: [{ $divide: ['$score', '$total'] }, 100] } },
        maxPercentage: { $max: { $multiply: [{ $divide: ['$score', '$total'] }, 100] } },
      },
    },
  ]);

  const avgScore = avgResult.length > 0 ? Math.round(avgResult[0].avgPercentage) : 0;
  const highestScore = avgResult.length > 0 ? Math.round(avgResult[0].maxPercentage) : 0;

  // Lịch sử quiz (user hiện tại)
  const userResults = await QuizResult.find({
    quizId: { $in: quizIdList },
    userId: req.user._id,
  })
    .populate('quizId', 'topic')
    .sort({ createdAt: -1 })
    .limit(10);

  const quizHistory = userResults.map((r) => ({
    topic: r.quizId?.topic || 'N/A',
    score: r.score,
    total: r.total,
    percentage: Math.round((r.score / r.total) * 100),
    date: r.createdAt,
  }));

  // Top performers (tất cả thành viên)
  const topPerformersAgg = await QuizResult.aggregate([
    { $match: { quizId: { $in: quizIdList } } },
    {
      $group: {
        _id: '$userId',
        avgScore: { $avg: { $multiply: [{ $divide: ['$score', '$total'] }, 100] } },
        totalAttempts: { $sum: 1 },
      },
    },
    { $sort: { avgScore: -1 } },
    { $limit: 10 },
  ]);

  // Populate user names
  const User = require('../models/User');
  const topPerformers = await Promise.all(
    topPerformersAgg.map(async (p) => {
      const u = await User.findById(p._id).select('name');
      return {
        name: u?.name || 'N/A',
        avgScore: Math.round(p.avgScore),
        totalAttempts: p.totalAttempts,
      };
    })
  );

  // Hoạt động gần đây
  const recentResults = await QuizResult.find({ quizId: { $in: quizIdList } })
    .populate('userId', 'name')
    .populate('quizId', 'topic')
    .sort({ createdAt: -1 })
    .limit(10);

  const recentActivity = recentResults.map((r) => ({
    userName: r.userId?.name || 'N/A',
    topic: r.quizId?.topic || 'N/A',
    score: r.score,
    total: r.total,
    percentage: Math.round((r.score / r.total) * 100),
    submittedAt: r.createdAt,
  }));

  res.json({
    success: true,
    data: {
      overview: {
        totalQuizzes,
        totalAttempts,
        avgScore,
        highestScore,
      },
      quizHistory,
      topPerformers,
      recentActivity,
    },
  });
};

module.exports = {
  generateQuiz,
  getQuizzesByRoom,
  getQuizDetail,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
  getQuizAnalytics,
};
