const Conversation = require('../models/Conversation');
const checkRoomMembership = require('../middleware/checkMembership');
const aiService = require('../services/aiService');


/**
 * POST /api/ai/chat
 * Chat hỏi đáp với AI trong phòng học.
 * Body: { roomId, message, conversationId? }
 */
const chatWithAI = async (req, res) => {
  const { roomId, message, conversationId } = req.body;

  if (!roomId || !message) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp roomId và message',
    });
  }

  // Validate message length
  if (message.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Tin nhắn không được quá 5000 ký tự',
    });
  }

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  // Tìm hoặc tạo conversation
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      roomId,
      userId: req.user._id,
    });
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc trò chuyện',
      });
    }
  } else {
    // Tạo conversation mới
    conversation = new Conversation({
      roomId,
      userId: req.user._id,
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      messages: [],
    });
  }

  // Lấy history (tối đa 20 tin gần nhất cho context window)
  const history = conversation.messages.slice(-20).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Gọi AI
  const aiResponse = await aiService.chat(message, history);

  // Lưu cả user message và AI response
  conversation.messages.push(
    { role: 'user', content: message },
    { role: 'assistant', content: aiResponse }
  );
  await conversation.save();

  res.json({
    success: true,
    data: {
      conversationId: conversation._id,
      message: {
        role: 'assistant',
        content: aiResponse,
      },
    },
  });
};

/**
 * POST /api/ai/summarize
 * Tóm tắt đoạn văn bản bằng AI.
 * Body: { text, roomId?, language? }
 */
const summarizeText = async (req, res) => {
  const { text, roomId, language } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đoạn văn bản cần tóm tắt',
    });
  }

  if (text.length < 50) {
    return res.status(400).json({
      success: false,
      message: 'Đoạn văn bản quá ngắn (tối thiểu 50 ký tự)',
    });
  }

  // Validate max length
  if (text.length > 50000) {
    return res.status(400).json({
      success: false,
      message: 'Đoạn văn bản quá dài (tối đa 50000 ký tự)',
    });
  }

  // Nếu có roomId → kiểm tra membership
  if (roomId) {
    await checkRoomMembership(roomId, req.user._id);
  }

  // Gọi AI tóm tắt
  const summary = await aiService.summarize(text, language);

  res.json({
    success: true,
    data: { summary },
  });
};

/**
 * GET /api/ai/history/:roomId
 * Lấy lịch sử chat AI của user trong phòng.
 */
const getChatHistory = async (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Kiểm tra membership
  await checkRoomMembership(roomId, req.user._id);

  const total = await Conversation.countDocuments({
    roomId,
    userId: req.user._id,
  });

  const conversations = await Conversation.find({
    roomId,
    userId: req.user._id,
  })
    .select('title messages createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({
    success: true,
    data: {
      conversations,
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
 * GET /api/ai/conversation/:id
 * Lấy chi tiết 1 cuộc trò chuyện.
 */
const getConversation = async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy cuộc trò chuyện',
    });
  }

  res.json({
    success: true,
    data: { conversation },
  });
};

/**
 * DELETE /api/ai/conversation/:id
 * Xóa một cuộc trò chuyện.
 */
const deleteConversation = async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy cuộc trò chuyện',
    });
  }

  await Conversation.findByIdAndDelete(conversation._id);

  res.json({
    success: true,
    message: 'Đã xóa cuộc trò chuyện',
  });
};

/**
 * POST /api/ai/explain-quiz
 * AI giải thích chi tiết câu hỏi quiz.
 * Body: { question, options, correctIndex, userAnswer, roomId }
 */
const explainQuiz = async (req, res) => {
  const { question, options, correctIndex, userAnswer, roomId } = req.body;

  if (!question || !options || correctIndex === undefined || userAnswer === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đủ thông tin câu hỏi',
    });
  }

  // Kiểm tra membership nếu có roomId
  if (roomId) {
    await checkRoomMembership(roomId, req.user._id);
  }

  const explanation = await aiService.explainQuizAnswer({
    question,
    options,
    correctIndex,
    userAnswer,
  });

  res.json({
    success: true,
    data: { explanation },
  });
};

/**
 * GET /api/ai/study-suggestions
 * Tạo gợi ý học tập cá nhân hóa dựa trên data thực tế của user.
 */
// Simple in-memory cache (per user, TTL 30 phút)
const suggestionsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

const getStudySuggestions = async (req, res) => {
  const userId = req.user._id.toString();

  // Check cache
  const cached = suggestionsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      success: true,
      data: { suggestions: cached.suggestions, cached: true },
    });
  }

  const Room = require('../models/Room');
  const Quiz = require('../models/Quiz');
  const QuizResult = require('../models/QuizResult');

  // 1. Lấy tất cả phòng user tham gia
  const rooms = await Room.find({ members: req.user._id })
    .select('name subject updatedAt createdAt')
    .sort({ updatedAt: -1 })
    .lean();

  if (rooms.length === 0) {
    const defaultSuggestions = [{
      type: 'new_topic',
      icon: '💡',
      title: 'Bắt đầu hành trình học tập!',
      description: 'Hãy tạo hoặc tham gia phòng học để bắt đầu.',
      roomName: null,
      roomId: null,
      priority: 'high',
    }];
    return res.json({ success: true, data: { suggestions: defaultSuggestions, cached: false } });
  }

  const roomIds = rooms.map((r) => r._id);

  // 2. Lấy tất cả quiz trong các phòng user tham gia
  const quizzes = await Quiz.find({ roomId: { $in: roomIds } })
    .select('_id topic roomId createdAt')
    .lean();

  const quizIdList = quizzes.map((q) => q._id);

  // 3. Lấy kết quả quiz của user
  const userResults = await QuizResult.find({
    quizId: { $in: quizIdList },
    userId: req.user._id,
  })
    .populate('quizId', 'topic roomId')
    .sort({ createdAt: -1 })
    .lean();

  // 4. Tổng hợp data cho AI
  const now = new Date();
  const roomSummaries = rooms.map((room) => {
    const roomQuizzes = quizzes.filter((q) => q.roomId.toString() === room._id.toString());
    const roomResults = userResults.filter((r) => r.quizId?.roomId?.toString() === room._id.toString());

    const avgScore = roomResults.length > 0
      ? Math.round(roomResults.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / roomResults.length)
      : null;

    const daysSinceActivity = Math.floor((now - new Date(room.updatedAt)) / (1000 * 60 * 60 * 24));

    return {
      roomId: room._id.toString(),
      roomName: room.name,
      subject: room.subject,
      totalQuizzes: roomQuizzes.length,
      quizzesCompleted: roomResults.length,
      avgScore,
      daysSinceLastActivity: daysSinceActivity,
      weakTopics: roomResults
        .filter((r) => (r.score / r.total) < 0.6)
        .map((r) => r.quizId?.topic)
        .filter(Boolean),
    };
  });

  const userData = {
    totalRooms: rooms.length,
    totalQuizzesTaken: userResults.length,
    overallAvgScore: userResults.length > 0
      ? Math.round(userResults.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) / userResults.length)
      : null,
    rooms: roomSummaries,
    recentActivity: userResults.slice(0, 5).map((r) => ({
      topic: r.quizId?.topic,
      score: r.score,
      total: r.total,
      daysAgo: Math.floor((now - new Date(r.createdAt)) / (1000 * 60 * 60 * 24)),
    })),
  };

  // 5. Gọi AI
  const suggestions = await aiService.generateStudySuggestions(userData);

  // Cache kết quả
  suggestionsCache.set(userId, { suggestions, timestamp: Date.now() });

  res.json({
    success: true,
    data: { suggestions, cached: false },
  });
};

module.exports = { chatWithAI, summarizeText, getChatHistory, getConversation, deleteConversation, explainQuiz, getStudySuggestions };
