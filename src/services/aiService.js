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
      model: 'gemini-2.5-flash',
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

module.exports = { chat, summarize, generateQuiz, explainQuizAnswer, generateStudySuggestions };
