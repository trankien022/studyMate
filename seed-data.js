/**
 * Seed script — Tạo dữ liệu mẫu cho AI StudyMate
 * 30 users, 12 rooms, 15 quizzes, kết quả quiz, conversations
 * Chạy: npm run seed
 */

// ─── Ép UTF-8 trên Windows ───
if (process.platform === 'win32') {
  const { execSync } = require('child_process');
  try { execSync('chcp 65001', { stdio: 'ignore' }); } catch {}
}
process.stdout.setDefaultEncoding?.('utf8');
process.stderr.setDefaultEncoding?.('utf8');

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./src/models/User');
const Room = require('./src/models/Room');
const Conversation = require('./src/models/Conversation');
const Quiz = require('./src/models/Quiz');
const QuizResult = require('./src/models/QuizResult');
const Task = require('./src/models/Task');
const Document = require('./src/models/Document');
const Notification = require('./src/models/Notification');
const DirectMessage = require('./src/models/DirectMessage');
const Order = require('./src/models/Order');
const { UserBadge, BADGE_DEFINITIONS } = require('./src/models/Badge');
const TutorSession = require('./src/models/TutorSession');

const MONGODB_URI = process.env.MONGODB_URI;

// ──────────────────────────────────────────────────────────
// Dữ liệu 30 users (tên thật Việt Nam)
// ──────────────────────────────────────────────────────────
const USERS_DATA = [
  { name: 'Nguyễn Văn An',     email: 'an.nguyen@student.edu.vn',     password: '123456' },
  { name: 'Trần Thị Bình',     email: 'binh.tran@student.edu.vn',     password: '123456' },
  { name: 'Lê Minh Châu',      email: 'chau.le@student.edu.vn',       password: '123456' },
  { name: 'Phạm Đức Dũng',     email: 'dung.pham@student.edu.vn',     password: '123456' },
  { name: 'Hoàng Thị Hà',      email: 'ha.hoang@student.edu.vn',      password: '123456' },
  { name: 'Vũ Quang Huy',      email: 'huy.vu@student.edu.vn',        password: '123456' },
  { name: 'Đỗ Thị Kim Ngân',   email: 'ngan.do@student.edu.vn',       password: '123456' },
  { name: 'Bùi Thanh Tùng',    email: 'tung.bui@student.edu.vn',      password: '123456' },
  { name: 'Ngô Phương Linh',   email: 'linh.ngo@student.edu.vn',      password: '123456' },
  { name: 'Đặng Văn Khoa',     email: 'khoa.dang@student.edu.vn',     password: '123456' },
  { name: 'Trịnh Thị Mai',     email: 'mai.trinh@student.edu.vn',     password: '123456' },
  { name: 'Lý Hoàng Nam',      email: 'nam.ly@student.edu.vn',        password: '123456' },
  { name: 'Phan Thị Oanh',     email: 'oanh.phan@student.edu.vn',     password: '123456' },
  { name: 'Dương Minh Phúc',   email: 'phuc.duong@student.edu.vn',    password: '123456' },
  { name: 'Hồ Thị Quỳnh',     email: 'quynh.ho@student.edu.vn',      password: '123456' },
  { name: 'Tô Văn Sơn',        email: 'son.to@student.edu.vn',        password: '123456' },
  { name: 'Cao Thị Thảo',      email: 'thao.cao@student.edu.vn',      password: '123456' },
  { name: 'Đinh Quốc Uy',      email: 'uy.dinh@student.edu.vn',       password: '123456' },
  { name: 'Mai Xuân Vinh',     email: 'vinh.mai@student.edu.vn',      password: '123456' },
  { name: 'Lương Thị Yến',     email: 'yen.luong@student.edu.vn',     password: '123456' },
  { name: 'Trương Công Danh',  email: 'danh.truong@student.edu.vn',   password: '123456' },
  { name: 'Huỳnh Thị Giang',   email: 'giang.huynh@student.edu.vn',   password: '123456' },
  { name: 'Võ Đình Lâm',       email: 'lam.vo@student.edu.vn',        password: '123456' },
  { name: 'Nguyễn Thị Nhung',  email: 'nhung.nguyen2@student.edu.vn', password: '123456' },
  { name: 'Trần Quốc Bảo',    email: 'bao.tran@student.edu.vn',      password: '123456' },
  { name: 'Lê Thị Diễm',       email: 'diem.le@student.edu.vn',       password: '123456' },
  { name: 'Phạm Hữu Phát',    email: 'phat.pham@student.edu.vn',     password: '123456' },
  { name: 'Hoàng Minh Trí',    email: 'tri.hoang@student.edu.vn',     password: '123456' },
  { name: 'Vũ Thị Trang',      email: 'trang.vu@student.edu.vn',      password: '123456' },
  { name: 'Đỗ Anh Tuấn',      email: 'tuan.do@student.edu.vn',       password: '123456' },
];

// ──────────────────────────────────────────────────────────
// 12 Rooms (đa dạng môn học)
// ──────────────────────────────────────────────────────────
function buildRooms(users) {
  return [
    {
      name: 'Nhóm ôn thi Toán rời rạc',
      subject: 'Toán rời rạc',
      ownerIdx: 0,
      memberIdxs: [0, 1, 2, 3, 4, 9, 10, 14, 20, 27],
      notes: '# Toán rời rạc - Ghi chú ôn thi\n\n## Chương 1: Logic mệnh đề\n- Mệnh đề là câu khẳng định đúng hoặc sai\n- Các phép toán: AND (∧), OR (∨), NOT (¬), XOR (⊕)\n- Hệ quả logic p → q tương đương ¬p ∨ q\n\n## Chương 2: Lý thuyết tập hợp\n- Tập hợp con, tập lũy thừa\n- Phép hợp, giao, hiệu, bù',
      daysAgo: 0,
    },
    {
      name: 'Lập trình Web - Fullstack',
      subject: 'Lập trình Web',
      ownerIdx: 1,
      memberIdxs: [0, 1, 5, 7, 8, 12, 13, 17, 21, 24, 29],
      notes: '# Web Development Notes\n\n## Frontend\n- HTML5 semantic elements\n- CSS Flexbox & Grid\n- JavaScript ES6+, React\n\n## Backend\n- Node.js + Express\n- RESTful API design\n- MongoDB + Mongoose',
      daysAgo: 1,
    },
    {
      name: 'Tiếng Anh giao tiếp B2',
      subject: 'Tiếng Anh',
      ownerIdx: 2,
      memberIdxs: [1, 2, 4, 6, 11, 15, 19, 22, 25],
      notes: '# English B2 Study Notes\n\n## Grammar Focus\n- Conditional sentences (Type 0, 1, 2, 3)\n- Passive voice\n- Reported speech',
      daysAgo: 2,
    },
    {
      name: 'Cấu trúc dữ liệu & Giải thuật',
      subject: 'CTDL & GT',
      ownerIdx: 3,
      memberIdxs: [0, 3, 5, 7, 9, 13, 16, 18, 20, 23, 26, 28],
      notes: '# CTDL & Giải thuật\n\n## Mảng & Danh sách liên kết\n- Array: truy cập O(1), thêm/xóa O(n)\n- Linked List: thêm/xóa O(1)\n\n## Cây & Đồ thị\n- Binary Search Tree\n- BFS, DFS\n- Dijkstra',
      daysAgo: 0,
    },
    {
      name: 'Vật lý đại cương 2',
      subject: 'Vật lý',
      ownerIdx: 4,
      memberIdxs: [2, 4, 6, 10, 14, 19, 22, 25, 28],
      notes: '# Vật lý đại cương 2\n\n## Điện từ học\n- Định luật Coulomb\n- Điện trường, điện thế\n- Từ trường, cảm ứng điện từ',
      daysAgo: 3,
    },
    {
      name: 'Machine Learning cơ bản',
      subject: 'Machine Learning',
      ownerIdx: 5,
      memberIdxs: [0, 3, 5, 7, 9, 12, 17, 20, 23, 27, 29],
      notes: '# Machine Learning\n\n## Supervised Learning\n- Linear Regression\n- Logistic Regression\n- Decision Tree, Random Forest\n- Neural Networks\n\n## Unsupervised Learning\n- K-Means Clustering\n- PCA',
      daysAgo: 1,
    },
    {
      name: 'Nhập môn Trí tuệ nhân tạo',
      subject: 'Trí tuệ nhân tạo',
      ownerIdx: 9,
      memberIdxs: [3, 5, 7, 9, 12, 16, 18, 21, 24, 26],
      notes: '# Trí tuệ nhân tạo\n\n## Tìm kiếm\n- BFS, DFS, A*\n- Minimax, Alpha-Beta\n\n## Logic\n- Luật suy diễn\n- Biểu diễn tri thức',
      daysAgo: 4,
    },
    {
      name: 'Kinh tế vĩ mô',
      subject: 'Kinh tế học',
      ownerIdx: 6,
      memberIdxs: [4, 6, 8, 10, 11, 15, 19, 22, 25],
      notes: '# Kinh tế vĩ mô\n\n## GDP & Tăng trưởng\n- GDP danh nghĩa vs thực\n- Các yếu tố tăng trưởng\n\n## Lạm phát\n- CPI, chỉ số giá\n- Chính sách tiền tệ',
      daysAgo: 5,
    },
    {
      name: 'Mạng máy tính',
      subject: 'Mạng máy tính',
      ownerIdx: 7,
      memberIdxs: [0, 3, 7, 8, 13, 17, 20, 23, 26, 29],
      notes: '# Mạng máy tính\n\n## Mô hình OSI 7 tầng\n- Physical, Data Link, Network, Transport\n- Session, Presentation, Application\n\n## TCP/IP\n- TCP vs UDP\n- HTTP/HTTPS',
      daysAgo: 2,
    },
    {
      name: 'Xác suất thống kê',
      subject: 'Xác suất TK',
      ownerIdx: 10,
      memberIdxs: [2, 4, 6, 10, 11, 14, 15, 19, 22, 25, 28],
      notes: '# Xác suất & Thống kê\n\n## Xác suất\n- Quy tắc cộng, nhân\n- Bayes, xác suất có điều kiện\n\n## Thống kê\n- Trung bình, phương sai\n- Phân phối chuẩn\n- Kiểm định giả thuyết',
      daysAgo: 1,
    },
    {
      name: 'Thiết kế UX/UI',
      subject: 'UX/UI Design',
      ownerIdx: 8,
      memberIdxs: [1, 5, 8, 12, 16, 21, 24, 27],
      notes: '# UX/UI Design\n\n## Nguyên tắc thiết kế\n- Contrast, Repetition, Alignment, Proximity\n- Heuristics of Nielsen\n\n## Tools\n- Figma, Adobe XD\n- Design System',
      daysAgo: 3,
    },
    {
      name: 'Triết học Mác - Lênin',
      subject: 'Triết học',
      ownerIdx: 11,
      memberIdxs: [2, 6, 8, 10, 11, 14, 15, 19, 22, 25, 28, 29],
      notes: '# Triết học Mác - Lênin\n\n## Chủ nghĩa duy vật biện chứng\n- Vật chất và ý thức\n- Ba quy luật cơ bản\n\n## Chủ nghĩa duy vật lịch sử\n- Hình thái kinh tế - xã hội\n- Đấu tranh giai cấp',
      daysAgo: 6,
    },
  ];
}

// ──────────────────────────────────────────────────────────
// 15 Quizzes (1-2 quiz mỗi room, 4-5 câu mỗi quiz)
// ──────────────────────────────────────────────────────────
function buildQuizzes(rooms, users) {
  return [
    // Room 0: Toán rời rạc
    {
      roomId: rooms[0]._id, topic: 'Logic mệnh đề cơ bản', createdBy: users[0]._id,
      questions: [
        { question: 'Mệnh đề "Nếu trời mưa thì đường ướt" có dạng logic nào?', options: ['p ∧ q', 'p → q', 'p ∨ q', 'p ↔ q'], correctIndex: 1, explanation: 'Câu "Nếu...thì..." là dạng kéo theo (implication) p → q' },
        { question: 'Phủ định của "Tất cả sinh viên đều chăm chỉ" là gì?', options: ['Tất cả SV đều không chăm chỉ', 'Có ít nhất một SV không chăm chỉ', 'Không SV nào chăm chỉ', 'Một số SV chăm chỉ'], correctIndex: 1, explanation: 'Phủ định ∀x P(x) là ∃x ¬P(x)' },
        { question: 'p = TRUE, q = FALSE. Giá trị của p → q là?', options: ['TRUE', 'FALSE', 'Không xác định', 'NULL'], correctIndex: 1, explanation: 'p → q chỉ FALSE khi p = TRUE và q = FALSE' },
        { question: 'Hai mệnh đề tương đương logic khi nào?', options: ['Khi cùng TRUE', 'Khi cùng FALSE', 'Khi có cùng bảng chân trị', 'Khi có cùng số biến'], correctIndex: 2, explanation: 'Tương đương logic (≡) khi bảng chân trị giống nhau hoàn toàn' },
        { question: 'Phép toán nào KHÔNG phải phép toán logic?', options: ['AND (∧)', 'MOD (%)', 'OR (∨)', 'NOT (¬)'], correctIndex: 1, explanation: 'MOD (%) là phép toán số học, không phải logic' },
      ],
    },
    {
      roomId: rooms[0]._id, topic: 'Lý thuyết đồ thị', createdBy: users[1]._id,
      questions: [
        { question: 'Đồ thị đầy đủ K5 có bao nhiêu cạnh?', options: ['5', '10', '15', '20'], correctIndex: 1, explanation: 'Kn có n(n-1)/2 cạnh → 5×4/2 = 10' },
        { question: 'Thuật toán nào tìm đường đi ngắn nhất?', options: ['DFS', 'Dijkstra', 'Kruskal', 'Prim'], correctIndex: 1, explanation: 'Dijkstra tìm đường ngắn nhất từ 1 đỉnh nguồn' },
        { question: 'Cây khung có n đỉnh thì có bao nhiêu cạnh?', options: ['n', 'n-1', 'n+1', '2n'], correctIndex: 1, explanation: 'Cây có n đỉnh luôn có đúng n-1 cạnh' },
        { question: 'Đồ thị Euler là đồ thị có:', options: ['Chu trình Hamilton', 'Chu trình Euler', 'Đường đi ngắn nhất', 'Cây khung nhỏ nhất'], correctIndex: 1, explanation: 'Đồ thị Euler có chu trình đi qua mỗi cạnh đúng 1 lần' },
      ],
    },
    // Room 1: Lập trình Web
    {
      roomId: rooms[1]._id, topic: 'JavaScript ES6+ Fundamentals', createdBy: users[1]._id,
      questions: [
        { question: 'Sự khác biệt chính giữa let và var?', options: ['let nhanh hơn', 'let có block scope, var có function scope', 'var mới hơn', 'Giống nhau'], correctIndex: 1, explanation: 'let có block scope {}, var có function scope' },
        { question: 'const arr = [1,2,3]; arr.push(4); có lỗi không?', options: ['Có — const không cho thay đổi', 'Không — const chỉ ngăn reassign', 'Có — mảng const ko push được', 'Tùy browser'], correctIndex: 1, explanation: 'const ngăn reassign nhưng KHÔNG ngăn mutate' },
        { question: 'Arrow function khác function thường ở đâu?', options: ['Chạy nhanh hơn', 'Không có this riêng', 'Không nhận tham số', 'Luôn return undefined'], correctIndex: 1, explanation: 'Arrow function kế thừa this từ lexical scope' },
        { question: 'Destructuring dùng để làm gì?', options: ['Xóa property', 'Trích xuất property thành biến', 'Copy object', 'Merge objects'], correctIndex: 1, explanation: 'Trích xuất giá trị thành các biến riêng biệt' },
      ],
    },
    {
      roomId: rooms[1]._id, topic: 'React Hooks nâng cao', createdBy: users[5]._id,
      questions: [
        { question: 'useCallback dùng để làm gì?', options: ['Gọi API', 'Memo hóa function', 'Tạo state', 'Render component'], correctIndex: 1, explanation: 'useCallback memo hóa function tránh tạo lại mỗi render' },
        { question: 'useMemo khác useCallback ở điểm nào?', options: ['useMemo cho function, useCallback cho giá trị', 'useMemo cho giá trị, useCallback cho function', 'Giống nhau', 'useMemo chạy trước'], correctIndex: 1, explanation: 'useMemo memo hóa giá trị, useCallback memo hóa function' },
        { question: 'useRef thường dùng cho việc gì?', options: ['Gọi API', 'Lưu giá trị không gây re-render', 'Tạo state', 'Routing'], correctIndex: 1, explanation: 'useRef lưu giá trị persistent qua các lần render mà không trigger re-render' },
        { question: 'useEffect cleanup chạy khi nào?', options: ['Mount', 'Trước mỗi effect mới + unmount', 'Chỉ unmount', 'Không bao giờ'], correctIndex: 1, explanation: 'Cleanup chạy trước khi effect tiếp theo và khi unmount' },
      ],
    },
    // Room 2: Tiếng Anh
    {
      roomId: rooms[2]._id, topic: 'Conditional Sentences', createdBy: users[2]._id,
      questions: [
        { question: 'If I ___ rich, I would travel the world.', options: ['am', 'were', 'was being', 'will be'], correctIndex: 1, explanation: 'Câu điều kiện loại 2 dùng were cho tất cả ngôi' },
        { question: 'If she studies hard, she ___ the exam.', options: ['passes', 'will pass', 'would pass', 'passed'], correctIndex: 1, explanation: 'Câu điều kiện loại 1: If + present simple, will + V' },
        { question: 'Loại nào diễn tả sự thật hiển nhiên?', options: ['Type 0', 'Type 1', 'Type 2', 'Type 3'], correctIndex: 0, explanation: 'Type 0: If + present, present — sự thật chung' },
        { question: 'If I had known, I ___ helped.', options: ['will have', 'would have', 'had', 'would'], correctIndex: 1, explanation: 'Câu điều kiện loại 3: If had + PP, would have + PP' },
      ],
    },
    // Room 3: CTDL
    {
      roomId: rooms[3]._id, topic: 'Độ phức tạp thuật toán', createdBy: users[3]._id,
      questions: [
        { question: 'Binary Search có độ phức tạp?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctIndex: 1, explanation: 'Binary Search chia đôi mỗi bước → O(log n)' },
        { question: 'Bubble Sort worst case?', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], correctIndex: 2, explanation: 'Bubble Sort so sánh từng cặp → O(n²) worst case' },
        { question: 'Merge Sort time complexity?', options: ['O(n)', 'O(n²)', 'O(n log n)', 'O(log n)'], correctIndex: 2, explanation: 'Merge Sort luôn O(n log n) cả best/worst case' },
        { question: 'Truy cập mảng theo index là O(?)', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], correctIndex: 0, explanation: 'Mảng truy cập trực tiếp bằng index → O(1)' },
        { question: 'Stack hoạt động theo nguyên tắc?', options: ['FIFO', 'LIFO', 'Random', 'Priority'], correctIndex: 1, explanation: 'Stack: Last In First Out (LIFO)' },
      ],
    },
    // Room 4: Vật lý
    {
      roomId: rooms[4]._id, topic: 'Điện từ học cơ bản', createdBy: users[4]._id,
      questions: [
        { question: 'Đơn vị của cường độ điện trường?', options: ['V', 'V/m', 'C', 'A'], correctIndex: 1, explanation: 'Cường độ điện trường đo bằng V/m (Volt trên mét)' },
        { question: 'Định luật Coulomb mô tả?', options: ['Lực hấp dẫn', 'Lực tĩnh điện giữa 2 điện tích', 'Cảm ứng từ', 'Điện trở'], correctIndex: 1, explanation: 'Coulomb: F = kq₁q₂/r² — lực giữa 2 điện tích' },
        { question: 'Tụ điện dùng để?', options: ['Tạo điện', 'Tích trữ năng lượng điện', 'Đo điện áp', 'Tạo từ trường'], correctIndex: 1, explanation: 'Tụ điện tích trữ năng lượng dưới dạng điện trường' },
        { question: 'Đơn vị của điện dung?', options: ['Ohm', 'Henry', 'Farad', 'Tesla'], correctIndex: 2, explanation: 'Điện dung đo bằng Farad (F)' },
      ],
    },
    // Room 5: Machine Learning
    {
      roomId: rooms[5]._id, topic: 'Supervised Learning', createdBy: users[5]._id,
      questions: [
        { question: 'Linear Regression dùng cho bài toán?', options: ['Classification', 'Regression', 'Clustering', 'Dimensionality Reduction'], correctIndex: 1, explanation: 'Linear Regression dự đoán giá trị liên tục (regression)' },
        { question: 'Overfitting là gì?', options: ['Mô hình quá đơn giản', 'Mô hình quá phức tạp, học thuộc dữ liệu', 'Thiếu dữ liệu', 'Lỗi thuật toán'], correctIndex: 1, explanation: 'Overfitting: mô hình fit quá tốt trên train nhưng kém trên test' },
        { question: 'Activation function phổ biến nhất hiện nay?', options: ['Sigmoid', 'Tanh', 'ReLU', 'Step'], correctIndex: 2, explanation: 'ReLU (Rectified Linear Unit) phổ biến nhất vì đơn giản và hiệu quả' },
        { question: 'Gradient Descent dùng để?', options: ['Tăng loss', 'Tối ưu hàm mất mát', 'Tạo dữ liệu', 'Đánh giá mô hình'], correctIndex: 1, explanation: 'Gradient Descent tìm minimum của hàm loss bằng cách cập nhật trọng số' },
        { question: 'K-fold Cross Validation mục đích?', options: ['Tăng dữ liệu', 'Đánh giá mô hình đáng tin cậy hơn', 'Giảm overfitting', 'Tạo feature mới'], correctIndex: 1, explanation: 'K-fold CV chia data thành K phần, đánh giá K lần để có kết quả ổn định' },
      ],
    },
    // Room 6: AI
    {
      roomId: rooms[6]._id, topic: 'Thuật toán tìm kiếm AI', createdBy: users[9]._id,
      questions: [
        { question: 'A* sử dụng hàm đánh giá nào?', options: ['f(n) = g(n)', 'f(n) = h(n)', 'f(n) = g(n) + h(n)', 'f(n) = max(g,h)'], correctIndex: 2, explanation: 'A* dùng f(n) = g(n) + h(n), g là chi phí thực, h là ước lượng' },
        { question: 'BFS tìm kiếm theo thứ tự?', options: ['Theo chiều sâu', 'Theo chiều rộng', 'Random', 'Theo chi phí'], correctIndex: 1, explanation: 'BFS (Breadth-First Search) duyệt theo chiều rộng, từng mức' },
        { question: 'Minimax dùng cho?', options: ['Tìm đường đi', 'Game 2 người chơi', 'Clustering', 'Regression'], correctIndex: 1, explanation: 'Minimax dùng cho game đối kháng 2 người (tic-tac-toe, chess)' },
        { question: 'Heuristic admissible nghĩa là?', options: ['Luôn overestimate', 'Không bao giờ overestimate', 'Chính xác tuyệt đối', 'Random'], correctIndex: 1, explanation: 'Admissible: h(n) ≤ chi phí thực — không bao giờ đánh giá quá cao' },
      ],
    },
    // Room 8: Mạng máy tính
    {
      roomId: rooms[8]._id, topic: 'Mô hình OSI & TCP/IP', createdBy: users[7]._id,
      questions: [
        { question: 'Mô hình OSI có bao nhiêu tầng?', options: ['4', '5', '6', '7'], correctIndex: 3, explanation: 'OSI có 7 tầng: Physical → Application' },
        { question: 'HTTP hoạt động ở tầng nào?', options: ['Transport', 'Network', 'Application', 'Session'], correctIndex: 2, explanation: 'HTTP là giao thức tầng Application (tầng 7)' },
        { question: 'TCP khác UDP ở điểm chính nào?', options: ['TCP nhanh hơn', 'TCP đảm bảo tin cậy, UDP không', 'UDP bảo mật hơn', 'Giống nhau'], correctIndex: 1, explanation: 'TCP: reliable, ordered. UDP: fast, unreliable' },
        { question: 'IP address thuộc tầng nào?', options: ['Application', 'Transport', 'Network', 'Data Link'], correctIndex: 2, explanation: 'IP (Internet Protocol) thuộc tầng Network (tầng 3)' },
      ],
    },
    // Room 9: Xác suất TK
    {
      roomId: rooms[9]._id, topic: 'Xác suất cơ bản', createdBy: users[10]._id,
      questions: [
        { question: 'Tung đồng xu 2 lần, P(2 mặt sấp)?', options: ['1/2', '1/4', '1/3', '3/4'], correctIndex: 1, explanation: 'P = 1/2 × 1/2 = 1/4' },
        { question: 'P(A∪B) = ?', options: ['P(A)+P(B)', 'P(A)+P(B)-P(A∩B)', 'P(A)×P(B)', 'P(A)-P(B)'], correctIndex: 1, explanation: 'Công thức cộng: P(A∪B) = P(A) + P(B) - P(A∩B)' },
        { question: 'Phân phối chuẩn có dạng?', options: ['Hình vuông', 'Hình chuông', 'Đường thẳng', 'Hình tam giác'], correctIndex: 1, explanation: 'Normal distribution có dạng hình chuông (bell curve)' },
        { question: 'Kỳ vọng E(X) của biến ngẫu nhiên đều trên [a,b]?', options: ['a+b', '(a+b)/2', 'a×b', 'b-a'], correctIndex: 1, explanation: 'E(X) = (a+b)/2 cho phân phối đều' },
      ],
    },
    // Room 10: UX/UI
    {
      roomId: rooms[10]._id, topic: 'Nguyên tắc thiết kế UI', createdBy: users[8]._id,
      questions: [
        { question: 'CRAP trong thiết kế là gì?', options: ['Color, Resolution, Alignment, Proximity', 'Contrast, Repetition, Alignment, Proximity', 'Clarity, Resolution, Aesthetics, Proportion', 'Contrast, Rhythm, Alignment, Pattern'], correctIndex: 1, explanation: 'CRAP: Contrast, Repetition, Alignment, Proximity — 4 nguyên tắc cơ bản' },
        { question: 'Fitts\'s Law liên quan đến?', options: ['Màu sắc', 'Thời gian di chuyển đến mục tiêu', 'Typography', 'Layout grid'], correctIndex: 1, explanation: 'Fitts: thời gian chạm mục tiêu phụ thuộc khoảng cách và kích thước' },
        { question: 'Mobile-first design nghĩa là?', options: ['Chỉ thiết kế cho mobile', 'Thiết kế cho mobile trước rồi mở rộng', 'Mobile quan trọng nhất', 'Không cần responsive'], correctIndex: 1, explanation: 'Thiết kế cho mobile trước, sau đó mở rộng cho tablet/desktop' },
        { question: 'Bao nhiêu heuristics của Nielsen?', options: ['5', '8', '10', '12'], correctIndex: 2, explanation: 'Jakob Nielsen đề xuất 10 heuristics cho usability evaluation' },
      ],
    },
  ];
}

// ──────────────────────────────────────────────────────────
// Conversations mẫu
// ──────────────────────────────────────────────────────────
function buildConversations(rooms, users) {
  return [
    {
      roomId: rooms[0]._id, userId: users[0]._id, title: 'Giải thích phép toán logic XOR',
      messages: [
        { role: 'user', content: 'Giải thích cho mình phép toán XOR trong logic mệnh đề' },
        { role: 'assistant', content: '## Phép toán XOR (⊕)\n\nXOR (Exclusive OR) là phép "hoặc loại trừ".\n\n### Bảng chân trị:\n| p | q | p ⊕ q |\n|---|---|-------|\n| T | T | **F** |\n| T | F | **T** |\n| F | T | **T** |\n| F | F | **F** |\n\n### Đặc điểm:\n- XOR trả về **TRUE** khi **đúng 1 trong 2** vế đúng\n- Công thức: `p ⊕ q ≡ (p ∨ q) ∧ ¬(p ∧ q)`' },
      ],
    },
    {
      roomId: rooms[1]._id, userId: users[1]._id, title: 'React hooks cơ bản',
      messages: [
        { role: 'user', content: 'Giải thích useState và useEffect trong React' },
        { role: 'assistant', content: '## React Hooks cơ bản\n\n### 1. useState\n```jsx\nconst [count, setCount] = useState(0);\n```\n\n### 2. useEffect\n```jsx\nuseEffect(() => {\n  fetchData();\n  return () => { /* cleanup */ };\n}, [dependency]);\n```\n\n**Lưu ý:** useState bất đồng bộ, useEffect với `[]` chỉ chạy 1 lần.' },
      ],
    },
    {
      roomId: rooms[3]._id, userId: users[3]._id, title: 'So sánh Stack và Queue',
      messages: [
        { role: 'user', content: 'So sánh Stack và Queue cho mình' },
        { role: 'assistant', content: '## Stack vs Queue\n\n| Tiêu chí | Stack | Queue |\n|----------|-------|-------|\n| Nguyên tắc | LIFO | FIFO |\n| Thêm | push (đỉnh) | enqueue (cuối) |\n| Xóa | pop (đỉnh) | dequeue (đầu) |\n| Ứng dụng | Undo, DFS, call stack | BFS, hàng đợi in ấn |' },
      ],
    },
    {
      roomId: rooms[5]._id, userId: users[5]._id, title: 'Overfitting vs Underfitting',
      messages: [
        { role: 'user', content: 'Phân biệt overfitting và underfitting' },
        { role: 'assistant', content: '## Overfitting vs Underfitting\n\n### Overfitting (Quá khớp)\n- Mô hình quá phức tạp\n- Train accuracy cao, Test accuracy thấp\n- **Giải pháp:** Regularization, Dropout, thu thập thêm data\n\n### Underfitting (Dưới khớp)\n- Mô hình quá đơn giản\n- Cả Train và Test accuracy đều thấp\n- **Giải pháp:** Tăng complexity, thêm features, train lâu hơn' },
      ],
    },
    {
      roomId: rooms[8]._id, userId: users[7]._id, title: 'TCP 3-way handshake',
      messages: [
        { role: 'user', content: 'Giải thích TCP 3-way handshake' },
        { role: 'assistant', content: '## TCP 3-Way Handshake\n\n```\nClient ──── SYN ────→ Server\nClient ←── SYN+ACK ── Server  \nClient ──── ACK ────→ Server\n```\n\n1. **SYN:** Client gửi yêu cầu kết nối\n2. **SYN+ACK:** Server xác nhận và gửi lại\n3. **ACK:** Client xác nhận → kết nối thiết lập\n\nSau 3 bước, dữ liệu bắt đầu truyền.' },
      ],
    },
    {
      roomId: rooms[2]._id, userId: users[2]._id, title: 'Passive Voice rules',
      messages: [
        { role: 'user', content: 'Tóm tắt quy tắc chuyển sang câu bị động' },
        { role: 'assistant', content: '## Passive Voice\n\n### Công thức\n**Active:** S + V + O\n**Passive:** O + be + V3/ed + (by S)\n\n### Theo thì:\n| Thì | Passive |\n|-----|--------|\n| Present Simple | am/is/are + V3 |\n| Past Simple | was/were + V3 |\n| Present Perfect | has/have been + V3 |\n| Future Simple | will be + V3 |\n\n### Ví dụ:\n- Active: She **writes** a letter\n- Passive: A letter **is written** by her' },
      ],
    },
    {
      roomId: rooms[4]._id, userId: users[4]._id, title: 'Giải thích định luật Faraday',
      messages: [
        { role: 'user', content: 'Giải thích định luật Faraday về cảm ứng điện từ' },
        { role: 'assistant', content: '## Định luật Faraday\n\n### Phát biểu\nSuất điện động cảm ứng trong mạch kín tỉ lệ với tốc độ biến thiên từ thông qua mạch.\n\n### Công thức\n```\nε = -dΦ/dt\n```\n\n- ε: suất điện động cảm ứng (V)\n- Φ: từ thông (Wb)\n- Dấu (-): theo định luật Lenz\n\n### Ứng dụng\n- Máy phát điện\n- Biến áp\n- Bếp từ' },
      ],
    },
    {
      roomId: rooms[9]._id, userId: users[10]._id, title: 'Định lý Bayes giải thích',
      messages: [
        { role: 'user', content: 'Giải thích định lý Bayes dễ hiểu' },
        { role: 'assistant', content: '## Định lý Bayes\n\n### Công thức\n```\nP(A|B) = P(B|A) × P(A) / P(B)\n```\n\n### Ý nghĩa\n- **P(A|B):** Xác suất A xảy ra khi biết B đã xảy ra\n- **P(B|A):** Xác suất B xảy ra khi A xảy ra\n- **P(A):** Xác suất tiên nghiệm\n- **P(B):** Xác suất biên\n\n### Ví dụ\nXét nghiệm bệnh: Nếu dương tính, xác suất thực sự mắc bệnh là bao nhiêu?\n→ Dùng Bayes để tính "posterior probability"' },
      ],
    },
  ];
}

// ──────────────────────────────────────────────────────────
// Helper: random integer
// ──────────────────────────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAnswers(total, correctAnswers) {
  // Tạo mảng câu trả lời ngẫu nhiên, đảm bảo đúng score câu
  const answers = [];
  let correctLeft = correctAnswers;
  for (let i = 0; i < total; i++) {
    if (correctLeft > 0 && (Math.random() < 0.5 || total - i === correctLeft)) {
      answers.push(-1); // placeholder cho đáp án đúng
      correctLeft--;
    } else {
      answers.push(randInt(0, 3)); // random answer
    }
  }
  return answers;
}

// ══════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ══════════════════════════════════════════════════════════
async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu lớn (30 users)...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB\n');

  // ─── 1. Tạo 30 Users ─────────────────────────────────
  console.log('👤 Tạo 30 Users...');
  const users = [];
  for (const u of USERS_DATA) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
      console.log(`  ✅ ${u.name}`);
    } else {
      console.log(`  ⚠️  Đã tồn tại: ${u.name}`);
    }
    users.push(user);
  }

  // Set một số user là Premium
  const premiumIdxs = [0, 3, 5, 9, 12, 17, 20, 24];
  for (const idx of premiumIdxs) {
    if (!users[idx].isPremium) {
      users[idx].isPremium = true;
      users[idx].premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await users[idx].save();
      console.log(`  👑 Premium: ${users[idx].name}`);
    }
  }
  console.log(`  → Tổng: ${users.length} users (${premiumIdxs.length} Premium)\n`);

  // ─── 2. Tạo 12 Rooms ─────────────────────────────────
  console.log('🏠 Tạo 12 Rooms...');
  const roomsConfig = buildRooms(users);
  const rooms = [];

  for (const r of roomsConfig) {
    let room = await Room.findOne({ name: r.name });
    if (!room) {
      room = await Room.create({
        name: r.name,
        subject: r.subject,
        owner: users[r.ownerIdx]._id,
        members: r.memberIdxs.map((i) => users[i]._id),
        notes: r.notes,
        isPublic: true,
        description: `Chào mừng bạn đến với phòng học cộng đồng môn ${r.subject}. Nơi mọi người chia sẻ kiến thức, thảo luận bài tập và thi thử. Tham gia cùng bọn mình nhé!`,
      });
      // Fake updatedAt cho đa dạng
      if (r.daysAgo > 0) {
        room.updatedAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
        await room.save();
      }
      console.log(`  ✅ "${r.name}" (${r.memberIdxs.length} TV, code: ${room.inviteCode})`);
    } else {
      console.log(`  ⚠️  Đã tồn tại: "${r.name}"`);
    }
    rooms.push(room);
  }
  console.log(`  → Tổng: ${rooms.length} rooms\n`);

  // ─── 3. Tạo 8 Conversations ──────────────────────────
  console.log('💬 Tạo Conversations...');
  const convsData = buildConversations(rooms, users);
  for (const c of convsData) {
    const existing = await Conversation.findOne({ roomId: c.roomId, userId: c.userId, title: c.title });
    if (!existing) {
      await Conversation.create(c);
      console.log(`  ✅ "${c.title}"`);
    } else {
      console.log(`  ⚠️  Đã tồn tại: "${c.title}"`);
    }
  }
  console.log();

  // ─── 4. Tạo 15 Quizzes ───────────────────────────────
  console.log('🧠 Tạo Quizzes...');
  const quizzesData = buildQuizzes(rooms, users);
  const quizzes = [];

  for (const q of quizzesData) {
    const existing = await Quiz.findOne({ roomId: q.roomId, topic: q.topic });
    if (!existing) {
      const quiz = await Quiz.create(q);
      quizzes.push(quiz);
      console.log(`  ✅ "${q.topic}" (${q.questions.length} câu)`);
    } else {
      quizzes.push(existing);
      console.log(`  ⚠️  Đã tồn tại: "${q.topic}"`);
    }
  }
  console.log(`  → Tổng: ${quizzes.length} quizzes\n`);

  // ─── 5. Tạo Quiz Results (nhiều user làm quiz) ───────
  console.log('🏆 Tạo Quiz Results...');
  let resultCount = 0;

  for (const quiz of quizzes) {
    // Tìm room để biết members
    const room = rooms.find((r) => r._id.toString() === quiz.roomId.toString());
    if (!room) continue;

    const memberIds = room.members.map((m) => m.toString());
    // Lấy random 40-80% members đã làm quiz
    const doersCount = Math.max(2, Math.floor(memberIds.length * (0.4 + Math.random() * 0.4)));
    const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
    const doers = shuffled.slice(0, doersCount);

    for (const userId of doers) {
      // Skip nếu là người tạo quiz (trong một số trường hợp)
      const existing = await QuizResult.findOne({ quizId: quiz._id, userId });
      if (existing) continue;

      const total = quiz.questions.length;
      const score = randInt(Math.max(0, total - 3), total); // điểm từ (total-3) đến total
      const answers = quiz.questions.map((q, i) => {
        if (i < score) return q.correctIndex; // đúng
        return (q.correctIndex + randInt(1, 3)) % 4; // sai ngẫu nhiên
      });

      await QuizResult.create({
        quizId: quiz._id,
        userId,
        score,
        total,
        answers,
        submittedAt: new Date(Date.now() - randInt(0, 14) * 24 * 60 * 60 * 1000),
      });
      resultCount++;
    }
  }
  console.log(`  ✅ Tạo ${resultCount} quiz results\n`);

  // ─── 6. Tạo Tasks (Kanban Board) ─────────────────────
  console.log('📋 Tạo Tasks...');
  let taskCount = 0;
  for (const r of rooms) {
    const statuses = ['todo', 'in_progress', 'review', 'done'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    for (let i = 0; i < 3; i++) {
        await Task.create({
            title: `Nhiệm vụ ôn tập ${i + 1}`,
            description: `Chi tiết nhiệm vụ ôn tập cho môn ${r.subject}`,
            roomId: r._id,
            createdBy: r.owner,
            assignees: r.members.slice(0, 2),
            status: statuses[randInt(0, 3)],
            priority: priorities[randInt(0, 3)]
        });
        taskCount++;
    }
  }
  console.log(`  ✅ Tạo ${taskCount} tasks\n`);

  // ─── 7. Tạo Documents ────────────────────────────────
  console.log('📄 Tạo Documents...');
  let docCount = 0;
  for (const r of rooms) {
    await Document.create({
        originalName: `Tai_Lieu_${r.subject}.pdf`,
        fileName: `file_${r._id}_12345.pdf`,
        mimeType: 'application/pdf',
        size: 1024000,
        roomId: r._id,
        uploadedBy: r.owner,
        status: 'analyzed',
        analysis: { summary: 'Tóm tắt tài liệu', keyPoints: ['Điểm 1', 'Điểm 2'] }
    });
    docCount++;
  }
  console.log(`  ✅ Tạo ${docCount} documents\n`);

  // ─── 8. Tạo Direct Messages & Conversations (1-1) ────
  console.log('✉️  Tạo Direct Messages...');
  let dmCount = 0;
  for (let i = 0; i < 15; i++) { // 15 pairs
      const u1 = users[randInt(0, 9)];
      const u2 = users[randInt(10, 29)];
      const dsId = DirectMessage.getConversationId(u1._id, u2._id);
      
      await DirectMessage.create({
          conversationId: dsId,
          sender: u1._id,
          receiver: u2._id,
          content: `Chào bạn, mình hỏi chút về bài tập nhé!`,
          isRead: true
      });
      await DirectMessage.create({
          conversationId: dsId,
          sender: u2._id,
          receiver: u1._id,
          content: `Chào bạn, bạn hỏi đi!`,
          isRead: true
      });
      dmCount += 2;
  }
  console.log(`  ✅ Tạo ${dmCount} direct messages\n`);

  // ─── 9. Tạo Notifications ─────────────────────────────
  console.log('🔔 Tạo Notifications...');
  let notiCount = 0;
  for (const u of users) {
      await Notification.create({
          userId: u._id,
          type: 'system',
          title: 'Chào mừng đến với AI StudyMate',
          message: 'Chúc bạn học tập hiệu quả!',
          isRead: false
      });
      notiCount++;
  }
  console.log(`  ✅ Tạo ${notiCount} notifications\n`);

  // ─── 10. Tạo Orders (Premium Payments) ───────────────
  console.log('💳 Tạo Orders...');
  let orderCount = 0;
  for (const idx of premiumIdxs) {
      const u = users[idx];
      await Order.create({
          userId: u._id,
          orderId: `ORD${Date.now()}${idx}`,
          amount: 49000,
          status: 'success',
          vnpayTransactionNo: '123456789',
          payDate: '20231010120000',
      });
      orderCount++;
  }
  console.log(`  ✅ Tạo ${orderCount} orders\n`);

  // ─── 11. Tạo Badges cho Users ────────────────────────
  console.log('🏅 Tạo Badges...');
  let badgeCount = 0;
  for (const u of users) {
      await UserBadge.create({
          userId: u._id,
          badgeCode: 'first_room',
          unlocked: true,
          progress: 1,
          unlockedAt: new Date()
      });
      badgeCount++;
  }
  console.log(`  ✅ Tạo ${badgeCount} badges\n`);

  // ─── 12. Tạo Tutor Sessions ──────────────────────────
  console.log('👨‍🏫 Tạo Tutor Sessions...');
  let tutorCount = 0;
  for (const u of users) {
      await TutorSession.create({
          userId: u._id,
          subject: 'Lập trình Web',
          topic: 'React',
          title: 'Phiên học React cơ bản',
          status: 'completed',
          messages: [
              { role: 'user', content: 'React là gì?' },
              { role: 'assistant', content: 'React là thư viện JS.' }
          ]
      });
      tutorCount++;
  }
  console.log(`  ✅ Tạo ${tutorCount} tutor sessions\n`);

  // ═══════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(55));
  console.log('🎉 SEED HOÀN TẤT!');
  console.log('═'.repeat(55));
  console.log(`\n📊 Tổng kết:`);
  console.log(`  👤 Users:          ${users.length} (${premiumIdxs.length} Premium)`);
  console.log(`  🏠 Rooms:          ${rooms.length}`);
  console.log(`  💬 Conversations:  ${convsData.length}`);
  console.log(`  🧠 Quizzes:        ${quizzes.length}`);
  console.log(`  🏆 Quiz Results:   ${resultCount}`);
  console.log(`  📋 Tasks:          ${taskCount}`);
  console.log(`  📄 Documents:      ${docCount}`);
  console.log(`  ✉️  DMs:           ${dmCount}`);
  console.log(`  🔔 Notifications:  ${notiCount}`);
  console.log(`  💳 Orders:         ${orderCount}`);
  console.log(`  🏅 Badges:         ${badgeCount}`);
  console.log(`  👨‍🏫 Tutor Sessions: ${tutorCount}`);

  console.log(`\n🔑 Tài khoản đăng nhập (tất cả mật khẩu: 123456):`);
  for (const u of USERS_DATA.slice(0, 5)) {
    console.log(`  📧 ${u.email}`);
  }
  console.log(`  ... và ${USERS_DATA.length - 5} tài khoản khác`);

  console.log(`\n🏠 Mã mời phòng:`);
  for (const r of rooms) {
    console.log(`  #${r.inviteCode} → "${r.name}" (${r.members?.length || '?'} TV)`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Đã ngắt kết nối MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Lỗi seed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
