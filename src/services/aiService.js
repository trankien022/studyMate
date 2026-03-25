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
const SYSTEM_PROMPT = `Ban la AI StudyMate - tro ly hoc tap thong minh danh cho sinh vien Viet Nam.

Nguyen tac:
- Tra loi bang tieng Viet, ro rang, de hieu
- Giai thich tung buoc khi giai bai tap
- Neu cau hoi mo ho, hoi lai de lam ro
- Dua vi du minh hoa khi co the
- Khuyen khich tu duy, khong chi dua dap an
- Su dung markdown de format cau tra loi (bullet points, bold, code blocks)`;

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

  const prompt = `Tao ${count} cau hoi trac nghiem ve chu de: "${topic}".

Yeu cau:
- Moi cau co dung 4 dap an (A, B, C, D)
- Chi co 1 dap an dung
- Co giai thich ngan gon cho dap an dung
- Do kho tu de den kho
- Tra loi bang tieng Viet

Tra ve DUNG format JSON sau, KHONG them bat ky text nao khac:
[
  {
    "question": "Noi dung cau hoi?",
    "options": ["Dap an A", "Dap an B", "Dap an C", "Dap an D"],
    "correctIndex": 0,
    "explanation": "Giai thich tai sao dap an dung"
  }
]

CHI TRA VE JSON ARRAY, KHONG CO MARKDOWN, KHONG CO BACKTICK.`;

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
      new Error('AI tra ve format khong hop le, vui long thu lai'),
      { statusCode: 502 }
    );
  }

  // Validate structure
  if (!Array.isArray(questions) || questions.length === 0) {
    throw Object.assign(
      new Error('AI khong tao duoc cau hoi, vui long thu lai'),
      { statusCode: 502 }
    );
  }

  // Validate từng câu
  return questions.map((q, i) => ({
    question: q.question || `Cau hoi ${i + 1}`,
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

module.exports = { chat, summarize, generateQuiz, explainQuizAnswer };
