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

module.exports = { chatWithAI, summarizeText, getChatHistory, getConversation, deleteConversation };
