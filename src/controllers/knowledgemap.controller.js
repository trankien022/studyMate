const KnowledgeMap = require('../models/KnowledgeMap');
const Room = require('../models/Room');
const Document = require('../models/Document');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const checkRoomMembership = require('../middleware/checkMembership');
const aiService = require('../services/aiService');

// ─── Controllers ─────────────────────────────────────────────

/**
 * POST /api/knowledge-map
 * Tạo Knowledge Map mới — cho cá nhân hoặc phòng học.
 * Body: { title, subject, roomId? }
 */
const createMap = async (req, res) => {
  const { title, subject, roomId } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Tiêu đề bản đồ kiến thức không được để trống',
    });
  }

  if (!subject || !subject.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Môn học / chủ đề không được để trống',
    });
  }

  // Nếu tạo cho phòng → kiểm tra membership
  if (roomId) {
    await checkRoomMembership(roomId, req.user._id);
  }

  const map = await KnowledgeMap.create({
    title: title.trim(),
    subject: subject.trim(),
    roomId: roomId || null,
    userId: req.user._id,
    nodes: [],
    edges: [],
    gaps: [],
    stats: { totalNodes: 0, totalEdges: 0, averageMastery: 0 },
  });

  res.status(201).json({
    success: true,
    message: 'Tạo bản đồ kiến thức thành công',
    data: { map },
  });
};

/**
 * GET /api/knowledge-map
 * Lấy danh sách Knowledge Map của user (cá nhân + phòng).
 * Query: ?roomId=xxx (lọc theo phòng, optional)
 */
const getMaps = async (req, res) => {
  const { roomId } = req.query;
  const filter = { userId: req.user._id };

  if (roomId) {
    await checkRoomMembership(roomId, req.user._id);
    filter.roomId = roomId;
  }

  const maps = await KnowledgeMap.find(filter)
    .select('-nodes -edges -gaps')
    .sort({ updatedAt: -1 })
    .populate('roomId', 'name subject')
    .limit(50);

  res.json({
    success: true,
    data: { maps },
  });
};

/**
 * GET /api/knowledge-map/:id
 * Lấy chi tiết 1 Knowledge Map (bao gồm nodes, edges, gaps).
 */
const getMapDetail = async (req, res) => {
  const map = await KnowledgeMap.findById(req.params.id)
    .populate('roomId', 'name subject')
    .populate('userId', 'name avatar');

  if (!map) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản đồ kiến thức',
    });
  }

  // Kiểm tra quyền: chủ sở hữu hoặc thành viên phòng
  if (map.roomId) {
    await checkRoomMembership(map.roomId._id || map.roomId, req.user._id);
  } else if (map.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xem bản đồ này',
    });
  }

  res.json({
    success: true,
    data: { map },
  });
};

/**
 * POST /api/knowledge-map/:id/generate
 * AI tự động tạo nodes từ text input hoặc từ dữ liệu phòng học.
 * Body: { text?, sourceType: 'text' | 'room' }
 */
const generateNodes = async (req, res) => {
  const { text, sourceType } = req.body;

  const map = await KnowledgeMap.findById(req.params.id);
  if (!map) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản đồ kiến thức',
    });
  }

  // Kiểm tra quyền sở hữu
  if (map.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền chỉnh sửa bản đồ này',
    });
  }

  let contentText = '';

  if (sourceType === 'room' && map.roomId) {
    // Thu thập dữ liệu từ room: documents + notes + quiz
    const [documents, room, quizzes] = await Promise.all([
      Document.find({ roomId: map.roomId, status: 'analyzed' }).select('extractedText originalName').limit(5),
      Room.findById(map.roomId).select('notes subject'),
      Quiz.find({ room: map.roomId }).select('topic questions').limit(5),
    ]);

    const docTexts = documents.map(d => `[Tài liệu: ${d.originalName}]\n${(d.extractedText || '').substring(0, 3000)}`).join('\n\n');
    const notesText = room?.notes ? `[Ghi chú phòng]\n${room.notes.substring(0, 2000)}` : '';
    const quizText = quizzes.map(q => `[Quiz: ${q.topic}]\n${q.questions.map(qq => qq.question).join('\n')}`).join('\n\n');

    contentText = [docTexts, notesText, quizText].filter(Boolean).join('\n\n---\n\n');
  } else if (text && text.trim()) {
    contentText = text.trim();
  }

  if (!contentText || contentText.length < 50) {
    return res.status(400).json({
      success: false,
      message: 'Không đủ nội dung để phân tích. Cần ít nhất 50 ký tự hoặc dữ liệu phòng học.',
    });
  }

  // Gọi AI trích xuất
  const { nodes: newNodes, edges: newEdges } = await aiService.extractKnowledgeNodes(
    contentText,
    map.subject
  );

  if (newNodes.length === 0) {
    return res.status(502).json({
      success: false,
      message: 'AI không trích xuất được khái niệm nào. Vui lòng thử lại.',
    });
  }

  // Merge nodes mới — tránh trùng lặp dựa trên label
  const existingLabels = new Set(map.nodes.map(n => n.label.toLowerCase()));
  const maxExistingId = map.nodes.reduce((max, n) => {
    const numMatch = n.id.match(/node_(\d+)/);
    return numMatch ? Math.max(max, parseInt(numMatch[1], 10)) : max;
  }, 0);

  let idCounter = maxExistingId;
  const idMapping = {};

  const uniqueNewNodes = newNodes.filter(n => !existingLabels.has(n.label.toLowerCase()));
  const nodesToAdd = uniqueNewNodes.map((n) => {
    idCounter++;
    const newId = `node_${idCounter}`;
    idMapping[n.id] = newId;
    return {
      id: newId,
      label: n.label,
      description: n.description,
      category: n.category,
      mastery: 0,
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200,
      source: 'ai',
    };
  });

  // Map edge references sang IDs mới
  const edgesToAdd = newEdges
    .filter(e => idMapping[e.source] && idMapping[e.target])
    .map(e => ({
      source: idMapping[e.source],
      target: idMapping[e.target],
      label: e.label,
      strength: e.strength,
    }));

  map.nodes.push(...nodesToAdd);
  map.edges.push(...edgesToAdd);
  map.stats.totalNodes = map.nodes.length;
  map.stats.totalEdges = map.edges.length;
  map.stats.lastAnalyzedAt = new Date();
  await map.save();

  res.json({
    success: true,
    message: `Đã thêm ${nodesToAdd.length} khái niệm và ${edgesToAdd.length} mối quan hệ`,
    data: {
      addedNodes: nodesToAdd.length,
      addedEdges: edgesToAdd.length,
      map,
    },
  });
};

/**
 * POST /api/knowledge-map/:id/analyze-gaps
 * AI phân tích lỗ hổng kiến thức dựa trên quiz results.
 */
const analyzeGaps = async (req, res) => {
  const map = await KnowledgeMap.findById(req.params.id);
  if (!map) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản đồ kiến thức',
    });
  }

  if (map.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền phân tích bản đồ này',
    });
  }

  // Thu thập quiz results của user
  const quizResults = await QuizResult.find({ user: req.user._id })
    .populate('quiz', 'topic questions')
    .sort({ createdAt: -1 })
    .limit(20);

  const studyData = {
    subject: map.subject,
    existingNodes: map.nodes.map(n => ({ label: n.label, mastery: n.mastery, category: n.category })),
    quizResults: quizResults.map(r => ({
      topic: r.quiz?.topic || 'Unknown',
      score: r.score,
      totalQuestions: r.totalQuestions,
      percentage: r.totalQuestions > 0 ? Math.round((r.score / r.totalQuestions) * 100) : 0,
    })),
  };

  const gaps = await aiService.analyzeKnowledgeGaps(studyData);

  map.gaps = gaps;
  await map.save();

  // Cập nhật mastery của nodes dựa trên gaps
  if (gaps.length > 0) {
    const gapTopics = new Set(gaps.map(g => g.topic.toLowerCase()));
    map.nodes.forEach(node => {
      if (gapTopics.has(node.label.toLowerCase())) {
        const gap = gaps.find(g => g.topic.toLowerCase() === node.label.toLowerCase());
        if (gap) {
          node.mastery = gap.severity === 'high' ? 20 : gap.severity === 'medium' ? 50 : 75;
        }
      }
    });
    map.stats.averageMastery = map.nodes.length > 0
      ? Math.round(map.nodes.reduce((sum, n) => sum + n.mastery, 0) / map.nodes.length)
      : 0;
    await map.save();
  }

  res.json({
    success: true,
    message: `Phát hiện ${gaps.length} lỗ hổng kiến thức`,
    data: { gaps, stats: map.stats },
  });
};

/**
 * PATCH /api/knowledge-map/:id/node
 * Thêm node thủ công hoặc cập nhật node hiện có.
 * Body: { nodeId?, label, description?, category?, mastery?, x?, y? }
 */
const updateNode = async (req, res) => {
  const { nodeId, label, description, category, mastery, x, y } = req.body;

  const map = await KnowledgeMap.findById(req.params.id);
  if (!map) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản đồ kiến thức',
    });
  }

  if (map.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền chỉnh sửa bản đồ này',
    });
  }

  if (nodeId) {
    // Cập nhật node hiện có
    const node = map.nodes.find(n => n.id === nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy node',
      });
    }
    if (label) node.label = label.substring(0, 100);
    if (description !== undefined) node.description = description.substring(0, 500);
    if (category) node.category = category;
    if (mastery !== undefined) node.mastery = Math.max(0, Math.min(100, mastery));
    if (x !== undefined) node.x = x;
    if (y !== undefined) node.y = y;
  } else {
    // Thêm node mới thủ công
    if (!label || !label.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên khái niệm không được để trống',
      });
    }
    const maxId = map.nodes.reduce((max, n) => {
      const numMatch = n.id.match(/node_(\d+)/);
      return numMatch ? Math.max(max, parseInt(numMatch[1], 10)) : max;
    }, 0);
    map.nodes.push({
      id: `node_${maxId + 1}`,
      label: label.trim().substring(0, 100),
      description: (description || '').substring(0, 500),
      category: category || 'concept',
      mastery: mastery || 0,
      x: x || Math.random() * 400 - 200,
      y: y || Math.random() * 300 - 150,
      source: 'manual',
    });
  }

  map.stats.totalNodes = map.nodes.length;
  map.stats.averageMastery = map.nodes.length > 0
    ? Math.round(map.nodes.reduce((sum, n) => sum + n.mastery, 0) / map.nodes.length)
    : 0;
  await map.save();

  res.json({
    success: true,
    message: nodeId ? 'Cập nhật node thành công' : 'Thêm node mới thành công',
    data: { map },
  });
};

/**
 * DELETE /api/knowledge-map/:id/node/:nodeId
 * Xóa node khỏi bản đồ (và các edge liên quan).
 */
const deleteNode = async (req, res) => {
  const { nodeId } = req.params;

  const map = await KnowledgeMap.findById(req.params.id);
  if (!map) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản đồ kiến thức',
    });
  }

  if (map.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền chỉnh sửa bản đồ này',
    });
  }

  const nodeIndex = map.nodes.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy node',
    });
  }

  // Xóa node
  map.nodes.splice(nodeIndex, 1);

  // Xóa tất cả edges liên quan đến node
  map.edges = map.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

  map.stats.totalNodes = map.nodes.length;
  map.stats.totalEdges = map.edges.length;
  map.stats.averageMastery = map.nodes.length > 0
    ? Math.round(map.nodes.reduce((sum, n) => sum + n.mastery, 0) / map.nodes.length)
    : 0;
  await map.save();

  res.json({
    success: true,
    message: 'Đã xóa node và các liên kết liên quan',
    data: { map },
  });
};

/**
 * DELETE /api/knowledge-map/:id
 * Xóa toàn bộ Knowledge Map.
 */
const deleteMap = async (req, res) => {
  const map = await KnowledgeMap.findById(req.params.id);
  if (!map) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy bản đồ kiến thức',
    });
  }

  if (map.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ người tạo mới có thể xóa bản đồ này',
    });
  }

  await KnowledgeMap.findByIdAndDelete(map._id);

  res.json({
    success: true,
    message: 'Đã xóa bản đồ kiến thức',
  });
};

module.exports = {
  createMap,
  getMaps,
  getMapDetail,
  generateNodes,
  analyzeGaps,
  updateNode,
  deleteNode,
  deleteMap,
};
