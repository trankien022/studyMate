const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

/**
 * Khởi tạo Gemini client (lazy init).
 */
const getModel = () => {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) {
      throw Object.assign(
        new Error('GEMINI_API_KEY chưa được cấu hình trong .env'),
        { statusCode: 503 }
      );
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite-preview',
      systemInstruction: {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }],
      },
    });
  }
  return model;
};

/**
 * System prompt mặc định cho AI StudyMate.
 */
const SYSTEM_PROMPT = `Bạn là AI StudyMate - trợ lý học tập thông minh dành cho sinh viên Việt Nam.

Nguyên tắc:
- Trả lời bằng tiếng Việt, rõ ràng, dễ hiểu
- Giải thích từng bước khi giải bài tập
- Nếu câu hỏi mơ hồ, hỏi lại để làm rõ
- Đưa ví dụ minh họa khi có thể
- Khuyến khích tư duy, không chỉ đưa đáp án
- Sử dụng markdown để format câu trả lời (bullet points, bold, code blocks)`;

/**
 * Chat với AI — gửi tin nhắn kèm lịch sử hội thoại.
 * @param {string} userMessage - Tin nhắn của user
 * @param {Array} history - Lịch sử tin nhắn [{role, content}]
 * @returns {string} Phản hồi của AI
 */
const chat = async (userMessage, history = []) => {
  const aiModel = getModel();

  // Chuyển history sang format Gemini
  const chatHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const chatSession = aiModel.startChat({
    history: chatHistory,
  });

  const result = await chatSession.sendMessage(userMessage);
  const response = result.response.text();

  return response;
};

/**
 * Tóm tắt đoạn văn bản bằng AI.
 * @param {string} text - Đoạn văn cần tóm tắt
 * @param {string} [language='vi'] - Ngôn ngữ output
 * @returns {string} Bản tóm tắt
 */
const summarize = async (text, language = 'vi') => {
  const aiModel = getModel();

  const prompt = `Hãy tóm tắt đoạn văn bản sau một cách ngắn gọn, rõ ràng, giữ lại các ý chính quan trọng.
Trả lời bằng ${language === 'vi' ? 'tiếng Việt' : 'ngôn ngữ gốc của văn bản'}.
Sử dụng bullet points để liệt kê các ý chính.

Đoạn văn bản:
"""
${text}
"""

Tóm tắt:`;

  const result = await aiModel.generateContent(prompt);
  const response = result.response.text();

  return response;
};

/**
 * Tạo bộ quiz từ chủ đề bằng AI.
 * @param {string} topic - Chủ đề quiz
 * @param {number} [count=5] - Số câu hỏi
 * @returns {Array} Mảng câu hỏi [{question, options, correctIndex, explanation}]
 */
const generateQuiz = async (topic, count = 5) => {
  const aiModel = getModel();

  const prompt = `Tạo ${count} câu hỏi trắc nghiệm về chủ đề: "${topic}".

Yêu cầu:
- Mỗi câu có đúng 4 đáp án (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Có giải thích ngắn gọn cho đáp án đúng
- Độ khó từ dễ đến khó
- Trả lời bằng tiếng Việt

Trả về ĐÚNG format JSON sau, KHÔNG thêm bất kỳ text nào khác:
[
  {
    "question": "Nội dung câu hỏi?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctIndex": 0,
    "explanation": "Giải thích tại sao đáp án đúng"
  }
]

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ MARKDOWN, KHÔNG CÓ BACKTICK.`;

  const result = await aiModel.generateContent(prompt);
  let responseText = result.response.text().trim();

  // Loại bỏ markdown code block nếu AI vẫn thêm
  responseText = responseText
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Parse JSON
  let questions;
  try {
    questions = JSON.parse(responseText);
  } catch {
    throw Object.assign(
      new Error('AI trả về format không hợp lệ, vui lòng thử lại'),
      { statusCode: 502 }
    );
  }

  // Validate structure
  if (!Array.isArray(questions) || questions.length === 0) {
    throw Object.assign(
      new Error('AI không tạo được câu hỏi, vui lòng thử lại'),
      { statusCode: 502 }
    );
  }

  // Validate từng câu
  return questions.map((q, i) => ({
    question: q.question || `Câu hỏi ${i + 1}`,
    options: Array.isArray(q.options) && q.options.length === 4
      ? q.options
      : ['A', 'B', 'C', 'D'],
    correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
      ? q.correctIndex
      : 0,
    explanation: q.explanation || '',
  }));
};

/**
 * Giải thích chi tiết câu hỏi quiz bằng AI.
 * @param {Object} params - { question, options, correctIndex, userAnswer }
 * @returns {string} Giải thích chi tiết
 */
const explainQuizAnswer = async ({ question, options, correctIndex, userAnswer }) => {
  const aiModel = getModel();
  const LETTERS = ['A', 'B', 'C', 'D'];

  const prompt = `Hãy giải thích chi tiết câu hỏi trắc nghiệm này cho sinh viên:

Câu hỏi: ${question}

Các đáp án:
${options.map((opt, i) => `${LETTERS[i]}. ${opt}`).join('\n')}

Đáp án đúng: ${LETTERS[correctIndex]}. ${options[correctIndex]}
Đáp án sinh viên chọn: ${LETTERS[userAnswer]}. ${options[userAnswer]}

Yêu cầu:
1. Giải thích TẠI SAO đáp án đúng là đúng (dẫn chứng, lý thuyết)
2. Giải thích tại sao đáp án sinh viên chọn là sai
3. Mẹo ghi nhớ hoặc cách phân biệt
4. Kiến thức liên quan cần nắm

Trả lời ngắn gọn, dễ hiểu, bằng tiếng Việt.`;

  const result = await aiModel.generateContent(prompt);
  return result.response.text();
};

/**
 * Tạo gợi ý học tập cá nhân hóa bằng AI.
 * @param {Object} userData - Dữ liệu học tập của user
 * @returns {Array} Mảng gợi ý [{type, title, description, roomId?, priority}]
 */
const generateStudySuggestions = async (userData) => {
  const aiModel = getModel();

  const prompt = `Dựa vào dữ liệu học tập của sinh viên dưới đây, hãy tạo 3-5 gợi ý học tập cá nhân hóa.

Dữ liệu học tập:
"""
${JSON.stringify(userData, null, 2)}
"""

Yêu cầu:
- Phân tích điểm yếu từ kết quả quiz (môn nào điểm thấp → gợi ý ôn lại)
- Phân tích tần suất học (phòng nào lâu không vào → nhắc nhở)
- Gợi ý bước tiếp theo phù hợp
- Mỗi gợi ý phải có hành động cụ thể
- Trả lời bằng tiếng Việt

Trả về ĐÚNG format JSON sau, KHÔNG thêm bất kỳ text nào khác:
[
  {
    "type": "weak_subject|inactive_room|streak|improvement|new_topic",
    "icon": "🔴|🟡|🔥|📈|💡",
    "title": "Tiêu đề ngắn gọn (dưới 50 ký tự)",
    "description": "Mô tả chi tiết và gợi ý hành động (dưới 100 ký tự)",
    "roomName": "Tên phòng liên quan (nếu có, hoặc null)",
    "roomId": "ID phòng (nếu có, hoặc null)",
    "priority": "high|medium|low"
  }
]

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ MARKDOWN, KHÔNG CÓ BACKTICK.`;

  const result = await aiModel.generateContent(prompt);
  let responseText = result.response.text().trim();

  // Loại bỏ markdown code block nếu AI vẫn thêm
  responseText = responseText
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let suggestions;
  try {
    suggestions = JSON.parse(responseText);
  } catch {
    // Fallback nếu AI trả về format không hợp lệ
    return [{
      type: 'improvement',
      icon: '💡',
      title: 'Tiếp tục học tập!',
      description: 'Hãy làm thêm quiz và ôn tập đều đặn để cải thiện kết quả.',
      roomName: null,
      roomId: null,
      priority: 'medium',
    }];
  }

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return [{
      type: 'improvement',
      icon: '💡',
      title: 'Bắt đầu hành trình học tập!',
      description: 'Hãy tạo hoặc tham gia phòng học và làm quiz để nhận gợi ý cá nhân hóa.',
      roomName: null,
      roomId: null,
      priority: 'medium',
    }];
  }

  // Validate & sanitize
  return suggestions.slice(0, 5).map((s) => ({
    type: s.type || 'improvement',
    icon: s.icon || '💡',
    title: (s.title || 'Gợi ý học tập').substring(0, 60),
    description: (s.description || '').substring(0, 150),
    roomName: s.roomName || null,
    roomId: s.roomId || null,
    priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
  }));
};

/**
 * Phân tích tài liệu bằng AI — tóm tắt, rút key points, gợi ý quiz topics.
 * @param {string} text - Nội dung text đã trích xuất từ tài liệu
 * @param {string} fileName - Tên file gốc
 * @returns {Object} { summary, keyPoints, suggestedQuizTopics }
 */
const analyzeDocument = async (text, fileName) => {
  const aiModel = getModel();

  // Giới hạn text gửi cho AI để tránh vượt context window
  const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '\n\n[... nội dung bị cắt bớt ...]' : text;

  const prompt = `Bạn là trợ lý phân tích tài liệu học thuật. Hãy phân tích tài liệu "${fileName}" dưới đây.

Nội dung tài liệu:
"""
${truncatedText}
"""

Yêu cầu phân tích:
1. Tóm tắt nội dung chính (200-400 từ)
2. Liệt kê 5-10 ý chính quan trọng nhất
3. Gợi ý 3-5 chủ đề có thể tạo quiz từ tài liệu này

Trả về ĐÚNG format JSON sau, KHÔNG thêm bất kỳ text nào khác:
{
  "summary": "Tóm tắt nội dung...",
  "keyPoints": ["Ý chính 1", "Ý chính 2", "..."],
  "suggestedQuizTopics": ["Chủ đề quiz 1", "Chủ đề quiz 2", "..."]
}

CHỈ TRẢ VỀ JSON OBJECT, KHÔNG CÓ MARKDOWN, KHÔNG CÓ BACKTICK.`;

  const result = await aiModel.generateContent(prompt);
  let responseText = result.response.text().trim();

  // Loại bỏ markdown code block nếu AI vẫn thêm
  responseText = responseText
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let analysis;
  try {
    analysis = JSON.parse(responseText);
  } catch {
    // Fallback nếu AI trả format không hợp lệ
    return {
      summary: 'Không thể phân tích tài liệu tự động. Vui lòng thử lại.',
      keyPoints: [],
      suggestedQuizTopics: [],
    };
  }

  return {
    summary: (analysis.summary || '').substring(0, 2000),
    keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints.slice(0, 10) : [],
    suggestedQuizTopics: Array.isArray(analysis.suggestedQuizTopics) ? analysis.suggestedQuizTopics.slice(0, 5) : [],
  };
};

/**
 * Hỏi đáp về nội dung tài liệu bằng AI.
 * @param {string} documentText - Nội dung text của tài liệu
 * @param {string} question - Câu hỏi của user
 * @param {Array} history - Lịch sử hỏi đáp [{role, content}]
 * @returns {string} Câu trả lời của AI
 */
const askAboutDocument = async (documentText, question, history = []) => {
  const aiModel = getModel();

  const truncatedText = documentText.length > 20000 ? documentText.substring(0, 20000) + '\n[... cắt bớt ...]' : documentText;

  const chatHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  // Thêm context tài liệu vào system message
  const contextMessage = {
    role: 'user',
    parts: [{ text: `Đây là nội dung tài liệu học tập, hãy dựa vào đây để trả lời câu hỏi:\n\n"""${truncatedText}"""\n\nHãy trả lời câu hỏi dựa trên nội dung tài liệu bên trên. Nếu câu hỏi không liên quan đến tài liệu, hãy nói rõ.` }],
  };

  const modelAck = {
    role: 'model',
    parts: [{ text: 'Tôi đã đọc tài liệu. Hãy hỏi tôi bất cứ điều gì về nội dung này.' }],
  };

  const fullHistory = [contextMessage, modelAck, ...chatHistory];

  const chatSession = aiModel.startChat({ history: fullHistory });
  const result = await chatSession.sendMessage(question);
  return result.response.text();
};

// ─── AI Tutor cá nhân hóa ──────────────────────────────────

/**
 * Mapping phong cách học sang prompt instruction.
 */
const LEARNING_STYLE_PROMPTS = {
  visual: 'Sử dụng nhiều sơ đồ, bảng biểu, hình ảnh ASCII art, emoji minh họa. Ưu tiên trình bày trực quan.',
  'step-by-step': 'Giải thích từng bước một, đánh số rõ ràng. Mỗi bước phải ngắn gọn và dễ theo dõi.',
  examples: 'Luôn đưa ví dụ cụ thể, thực tế trước khi giải thích lý thuyết. Càng nhiều ví dụ càng tốt.',
  socratic: 'Dùng phương pháp Socratic — đặt câu hỏi gợi mở để dẫn dắt sinh viên tự suy luận thay vì đưa đáp án trực tiếp.',
};

/**
 * Mapping mức độ khó sang prompt instruction.
 */
const DIFFICULTY_PROMPTS = {
  beginner: 'Giải thích ở mức cơ bản nhất, dùng ngôn ngữ đơn giản, tránh thuật ngữ phức tạp. Giống như giải thích cho người mới bắt đầu.',
  intermediate: 'Giải thích ở mức trung bình, có thể dùng thuật ngữ chuyên ngành nhưng cần define rõ.',
  advanced: 'Giải thích chuyên sâu, dùng thuật ngữ chính xác, kết nối với các concepts liên quan và ứng dụng nâng cao.',
};

/**
 * Chat với AI Tutor cá nhân hóa.
 * @param {string} message - Tin nhắn của user
 * @param {Object} config - { subject, topic, difficulty, learningStyle }
 * @param {Array} history - Lịch sử tin nhắn [{role, content}]
 * @returns {string} Phản hồi cá nhân hóa của AI Tutor
 */
const tutorChat = async (message, config, history = []) => {
  const aiModel = getModel();

  const { subject, topic, difficulty, learningStyle } = config;

  // Xây dựng system prompt cá nhân hóa
  const tutorSystemPrompt = `Bạn là AI Tutor cá nhân hóa — gia sư AI chuyên về "${subject}"${topic ? ` (chủ đề: ${topic})` : ''}.

Vai trò:
- Bạn là gia sư 1-1 kiên nhẫn, thân thiện, và chuyên gia.
- Nhiệm vụ chính: giúp sinh viên HIỂU sâu, không chỉ biết đáp án.
- Luôn kiểm tra xem sinh viên đã hiểu chưa bằng câu hỏi follow-up.

Phong cách dạy:
${LEARNING_STYLE_PROMPTS[learningStyle] || LEARNING_STYLE_PROMPTS['step-by-step']}

Mức độ:
${DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS['intermediate']}

Quy tắc:
- Trả lời bằng tiếng Việt, rõ ràng và có cấu trúc.
- Sử dụng markdown: headings, bold, code blocks, bullet points.
- Khi sinh viên trả lời đúng → khen ngợi & đưa câu hỏi nâng cao.
- Khi sinh viên trả lời sai → giải thích nhẹ nhàng, gợi ý hướng đúng.
- Cuối mỗi phần giải thích, đề xuất 1-2 câu hỏi liên quan để kiểm tra hiểu biết.
- Nếu sinh viên lạc đề → nhẹ nhàng đưa về chủ đề chính.
- Luôn khuyến khích và tạo động lực học.`;

  // Tạo model với system instruction tutor
  const tutorModel = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction: {
      role: 'user',
      parts: [{ text: tutorSystemPrompt }],
    },
  });

  // Chuyển history sang format Gemini
  const chatHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const chatSession = tutorModel.startChat({
    history: chatHistory,
  });

  const result = await chatSession.sendMessage(message);
  return result.response.text();
};

/**
 * Tạo tóm tắt phiên học AI Tutor — phân tích tiến trình và đề xuất.
 * @param {Object} sessionData - { subject, topic, messages, questionsAsked, questionsCorrect }
 * @returns {Object} { summary, conceptsCovered, masteryLevel, nextSteps }
 */
const generateTutorSummary = async (sessionData) => {
  const aiModel = getModel();

  const { subject, topic, messages, questionsAsked, questionsCorrect } = sessionData;

  // Chỉ lấy nội dung tin nhắn quan trọng (tối đa 30 tin)
  const messagesSummary = messages.slice(-30).map((m) => `${m.role === 'user' ? 'Sinh viên' : 'Tutor'}: ${m.content.substring(0, 200)}`).join('\n');

  const prompt = `Phân tích phiên học dưới đây để tạo báo cáo tiến trình học tập.

Môn: ${subject}
Chủ đề: ${topic || 'Chung'}
Số câu hỏi đã hỏi: ${questionsAsked || 0}
Số câu trả lời đúng: ${questionsCorrect || 0}

Nội dung trao đổi:
"""
${messagesSummary}
"""

Trả về ĐÚNG format JSON sau:
{
  "summary": "Tóm tắt ngắn gọn phiên học (2-3 câu)",
  "conceptsCovered": ["Khái niệm 1", "Khái niệm 2"],
  "masteryLevel": 75,
  "strengths": ["Điểm mạnh 1"],
  "weaknesses": ["Điểm cần cải thiện 1"],
  "nextSteps": ["Bước tiếp theo 1", "Bước tiếp theo 2"]
}

masteryLevel là số từ 0-100 dựa trên mức hiểu biết thể hiện trong cuộc trò chuyện.

CHỈ TRẢ VỀ JSON OBJECT, KHÔNG CÓ MARKDOWN, KHÔNG CÓ BACKTICK.`;

  const result = await aiModel.generateContent(prompt);
  let responseText = result.response.text().trim();

  // Loại bỏ markdown code block nếu AI vẫn thêm
  responseText = responseText
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let analysis;
  try {
    analysis = JSON.parse(responseText);
  } catch {
    // Fallback nếu AI trả format không hợp lệ
    return {
      summary: 'Phiên học đã kết thúc.',
      conceptsCovered: [],
      masteryLevel: 0,
      strengths: [],
      weaknesses: [],
      nextSteps: ['Tiếp tục ôn tập để nắm vững kiến thức.'],
    };
  }

  return {
    summary: (analysis.summary || '').substring(0, 500),
    conceptsCovered: Array.isArray(analysis.conceptsCovered) ? analysis.conceptsCovered.slice(0, 10) : [],
    masteryLevel: typeof analysis.masteryLevel === 'number'
      ? Math.max(0, Math.min(100, Math.round(analysis.masteryLevel)))
      : 0,
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : [],
    weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.slice(0, 5) : [],
    nextSteps: Array.isArray(analysis.nextSteps) ? analysis.nextSteps.slice(0, 5) : [],
  };
};

// ─── Knowledge Map AI ───────────────────────────────────────

/**
 * Trích xuất khái niệm và mối quan hệ từ text để xây dựng Knowledge Map.
 * @param {string} text - Nội dung text (từ documents, notes, quiz)
 * @param {string} subject - Môn học / chủ đề
 * @returns {Object} { nodes: [{id, label, description, category}], edges: [{source, target, label, strength}] }
 */
const extractKnowledgeNodes = async (text, subject) => {
  const aiModel = getModel();

  const truncatedText = text.length > 25000 ? text.substring(0, 25000) + '\n[... nội dung bị cắt bớt ...]' : text;

  const prompt = `Bạn là chuyên gia phân tích kiến thức. Hãy trích xuất các khái niệm chính và mối quan hệ giữa chúng từ nội dung dưới đây.

Môn học/Chủ đề: "${subject}"

Nội dung:
"""
${truncatedText}
"""

Yêu cầu:
1. Trích xuất 5-15 khái niệm/thuật ngữ quan trọng nhất
2. Xác định mối quan hệ giữa các khái niệm (bao hàm, phụ thuộc, liên quan, ví dụ, nguyên nhân-kết quả)
3. Phân loại mỗi khái niệm: concept (khái niệm), theory (lý thuyết), formula (công thức), definition (định nghĩa), example (ví dụ), application (ứng dụng)
4. Mô tả ngắn gọn mỗi khái niệm (1-2 câu)

Trả về ĐÚNG format JSON sau, KHÔNG thêm bất kỳ text nào khác:
{
  "nodes": [
    {
      "id": "node_1",
      "label": "Tên khái niệm",
      "description": "Mô tả ngắn gọn",
      "category": "concept|theory|formula|definition|example|application"
    }
  ],
  "edges": [
    {
      "source": "node_1",
      "target": "node_2",
      "label": "mô tả mối quan hệ (VD: bao gồm, dẫn đến, là ví dụ của)",
      "strength": 0.8
    }
  ]
}

QUAN TRỌNG:
- Mỗi node phải có id duy nhất dạng "node_1", "node_2",...
- source/target trong edges phải tham chiếu đúng id của nodes
- strength từ 0 đến 1 (1 = quan hệ rất chặt)
- Label edge ngắn gọn, dễ hiểu

CHỈ TRẢ VỀ JSON OBJECT, KHÔNG CÓ MARKDOWN, KHÔNG CÓ BACKTICK.`;

  const result = await aiModel.generateContent(prompt);
  let responseText = result.response.text().trim();

  // Loại bỏ markdown code block nếu AI vẫn thêm
  responseText = responseText
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    // Fallback nếu AI trả format không hợp lệ
    return { nodes: [], edges: [] };
  }

  // Validate & sanitize
  const nodes = Array.isArray(data.nodes) ? data.nodes.slice(0, 20).map((n, i) => ({
    id: n.id || `node_${i + 1}`,
    label: (n.label || `Khái niệm ${i + 1}`).substring(0, 100),
    description: (n.description || '').substring(0, 500),
    category: ['concept', 'theory', 'formula', 'definition', 'example', 'application'].includes(n.category)
      ? n.category : 'concept',
  })) : [];

  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = Array.isArray(data.edges) ? data.edges.filter(e =>
    nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target
  ).slice(0, 30).map(e => ({
    source: e.source,
    target: e.target,
    label: (e.label || '').substring(0, 80),
    strength: typeof e.strength === 'number' ? Math.max(0, Math.min(1, e.strength)) : 0.5,
  })) : [];

  return { nodes, edges };
};

/**
 * Phân tích lỗ hổng kiến thức dựa trên quiz results và dữ liệu học tập.
 * @param {Object} studyData - { quizResults, documents, subject, existingNodes }
 * @returns {Array} gaps [{ topic, severity, suggestion }]
 */
const analyzeKnowledgeGaps = async (studyData) => {
  const aiModel = getModel();

  const prompt = `Bạn là chuyên gia phân tích học tập. Dựa trên dữ liệu dưới đây, hãy xác định các lỗ hổng kiến thức.

Dữ liệu học tập:
"""
${JSON.stringify(studyData, null, 2)}
"""

Yêu cầu:
1. Phân tích kết quả quiz để tìm chủ đề yếu (câu trả lời sai nhiều)
2. So sánh với các khái niệm đã có trong Knowledge Map
3. Xác định 3-7 lỗ hổng kiến thức quan trọng nhất
4. Đề xuất cách khắc phục cụ thể cho mỗi lỗ hổng

Trả về ĐÚNG format JSON sau:
[
  {
    "topic": "Tên chủ đề/khái niệm bị yếu",
    "severity": "high|medium|low",
    "suggestion": "Gợi ý cách cải thiện cụ thể (dưới 150 ký tự)"
  }
]

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ MARKDOWN, KHÔNG CÓ BACKTICK.`;

  const result = await aiModel.generateContent(prompt);
  let responseText = result.response.text().trim();

  responseText = responseText
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let gaps;
  try {
    gaps = JSON.parse(responseText);
  } catch {
    return [];
  }

  if (!Array.isArray(gaps)) return [];

  return gaps.slice(0, 10).map(g => ({
    topic: (g.topic || 'Chủ đề không xác định').substring(0, 100),
    severity: ['high', 'medium', 'low'].includes(g.severity) ? g.severity : 'medium',
    suggestion: (g.suggestion || '').substring(0, 200),
  }));
};

module.exports = { chat, summarize, generateQuiz, explainQuizAnswer, generateStudySuggestions, analyzeDocument, askAboutDocument, tutorChat, generateTutorSummary, extractKnowledgeNodes, analyzeKnowledgeGaps };
