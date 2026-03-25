/**
 * Seed script — Tạo dữ liệu mẫu cho AI StudyMate
 * Chạy: npm run seed
 */

// ─── Ép UTF-8 trên Windows (tránh lỗi encoding tiếng Việt) ───
if (process.platform === 'win32') {
  const { execSync } = require('child_process');
  try { execSync('chcp 65001', { stdio: 'ignore' }); } catch {}
}
process.stdout.setDefaultEncoding?.('utf8');
process.stderr.setDefaultEncoding?.('utf8');

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');
const Room = require('./src/models/Room');
const Conversation = require('./src/models/Conversation');
const Quiz = require('./src/models/Quiz');
const QuizResult = require('./src/models/QuizResult');

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB\n');

  // ═══════════════════════════════════════════════════════
  // 1. Tạo 3 Users
  // ═══════════════════════════════════════════════════════
  console.log('👤 Tạo Users...');

  // Xóa dữ liệu cũ (trừ user testuser@example.com đã tạo khi test)
  // Không xóa gì — chỉ thêm mới

  const usersData = [
    { name: 'Nguyễn Văn An', email: 'an.nguyen@student.edu.vn', password: '123456' },
    { name: 'Trần Thị Bình', email: 'binh.tran@student.edu.vn', password: '123456' },
    { name: 'Lê Minh Châu', email: 'chau.le@student.edu.vn', password: '123456' },
  ];

  const users = [];
  for (const u of usersData) {
    // Kiểm tra email đã tồn tại chưa
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
      console.log(`  ✅ Tạo user: ${u.name} (${u.email})`);
    } else {
      console.log(`  ⚠️  User đã tồn tại: ${u.name} (${u.email})`);
    }
    users.push(user);
  }

  // Lấy cả user "Test User" đã tạo lúc test (nếu có)
  const testUser = await User.findOne({ email: 'testuser@example.com' });
  if (testUser) {
    users.push(testUser);
    console.log(`  ℹ️  Tìm thấy user test: ${testUser.name}`);
  }

  console.log(`  → Tổng: ${users.length} users\n`);

  // ═══════════════════════════════════════════════════════
  // 2. Tạo 3 Rooms
  // ═══════════════════════════════════════════════════════
  console.log('🏠 Tạo Rooms...');

  const roomsData = [
    {
      name: 'Nhóm ôn thi Toán rời rạc',
      subject: 'Toán rời rạc',
      owner: users[0]._id,
      members: [users[0]._id, users[1]._id, users[2]._id],
      notes: '# Toán rời rạc - Ghi chú ôn thi\n\n## Chương 1: Logic mệnh đề\n- Mệnh đề là câu khẳng định đúng hoặc sai\n- Các phép toán: AND (∧), OR (∨), NOT (¬), XOR (⊕)\n- Hệ quả logic p → q tương đương ¬p ∨ q\n\n## Chương 2: Lý thuyết tập hợp\n- Tập hợp con, tập lũy thừa\n- Phép hợp, giao, hiệu, bù\n\n## Chương 3: Quan hệ\n- Quan hệ phản xạ, đối xứng, bắc cầu\n- Quan hệ tương đương → lớp tương đương',
    },
    {
      name: 'Lập trình Web - Fullstack',
      subject: 'Lập trình Web',
      owner: users[1]._id,
      members: [users[0]._id, users[1]._id],
      notes: '# Web Development Notes\n\n## Frontend\n- HTML5 semantic elements\n- CSS Flexbox & Grid\n- JavaScript ES6+, React\n\n## Backend\n- Node.js + Express\n- RESTful API design\n- MongoDB + Mongoose\n\n## Deploy\n- Vercel (frontend)\n- Railway/Render (backend)',
    },
    {
      name: 'Tiếng Anh giao tiếp B2',
      subject: 'Tiếng Anh',
      owner: users[2]._id,
      members: [users[1]._id, users[2]._id],
      notes: '# English B2 Study Notes\n\n## Grammar Focus\n- Conditional sentences (Type 0, 1, 2, 3)\n- Passive voice\n- Reported speech\n\n## Vocabulary Topics\n- Environment & Climate\n- Technology & Innovation\n- Health & Lifestyle',
    },
  ];

  const rooms = [];
  for (const r of roomsData) {
    // Kiểm tra room đã tồn tại chưa (theo tên)
    let room = await Room.findOne({ name: r.name });
    if (!room) {
      room = await Room.create(r);
      console.log(`  ✅ Tạo room: "${r.name}" (code: ${room.inviteCode})`);
    } else {
      console.log(`  ⚠️  Room đã tồn tại: "${r.name}"`);
    }
    rooms.push(room);
  }

  // Thêm Test User vào room đầu tiên (nếu có)
  if (testUser && rooms[0]) {
    const isMember = rooms[0].members.some(
      (m) => m.toString() === testUser._id.toString()
    );
    if (!isMember) {
      rooms[0].members.push(testUser._id);
      await rooms[0].save();
      console.log(`  ✅ Thêm ${testUser.name} vào room "${rooms[0].name}"`);
    }
  }

  console.log(`  → Tổng: ${rooms.length} rooms\n`);

  // ═══════════════════════════════════════════════════════
  // 3. Tạo Conversations (chat history)
  // ═══════════════════════════════════════════════════════
  console.log('💬 Tạo Conversations...');

  const convsData = [
    {
      roomId: rooms[0]._id,
      userId: users[0]._id,
      title: 'Giải thích phép toán logic XOR',
      messages: [
        { role: 'user', content: 'Giải thích cho mình phép toán XOR trong logic mệnh đề' },
        {
          role: 'assistant',
          content:
            '## Phép toán XOR (⊕)\n\nXOR (Exclusive OR) là phép "hoặc loại trừ".\n\n### Bảng chân trị:\n| p | q | p ⊕ q |\n|---|---|-------|\n| T | T | **F** |\n| T | F | **T** |\n| F | T | **T** |\n| F | F | **F** |\n\n### Đặc điểm:\n- XOR trả về **TRUE** khi **đúng 1 trong 2** vế đúng\n- Khác OR thường: OR trả về TRUE khi ≥1 vế đúng\n- Công thức: `p ⊕ q ≡ (p ∨ q) ∧ ¬(p ∧ q)`\n\n### Ứng dụng:\n- Mã hóa (encryption)\n- Kiểm tra chẵn lẻ (parity check)\n- Toggle trạng thái trong lập trình',
        },
        { role: 'user', content: 'Cho ví dụ thực tế về XOR được không?' },
        {
          role: 'assistant',
          content:
            '### Ví dụ thực tế về XOR:\n\n**1. Công tắc đèn 2 chiều:**\nBạn có 2 công tắc ở 2 đầu phòng. Đèn sáng khi **đúng 1 công tắc** bật → đó chính là XOR!\n\n**2. Trò chơi Heads or Tails:**\n- Bạn và đối thủ cùng tung đồng xu\n- Bạn thắng nếu kết quả **khác nhau** → XOR\n\n**3. Trong lập trình:**\n```javascript\n// Swap 2 số không cần biến tạm\nlet a = 5, b = 3;\na = a ^ b; // a = 6\nb = a ^ b; // b = 5\na = a ^ b; // a = 3\n```',
        },
      ],
    },
    {
      roomId: rooms[1]._id,
      userId: users[1]._id,
      title: 'React hooks cơ bản',
      messages: [
        { role: 'user', content: 'Giải thích useState và useEffect trong React' },
        {
          role: 'assistant',
          content:
            '## React Hooks cơ bản\n\n### 1. useState\nQuản lý state trong functional component.\n\n```jsx\nconst [count, setCount] = useState(0);\n// count = giá trị hiện tại\n// setCount = hàm cập nhật state\n```\n\n### 2. useEffect\nXử lý side effects (gọi API, DOM, timer...).\n\n```jsx\nuseEffect(() => {\n  // Chạy sau mỗi lần render\n  fetchData();\n\n  return () => {\n    // Cleanup khi unmount\n  };\n}, [dependency]); // Chỉ chạy lại khi dependency thay đổi\n```\n\n### Lưu ý:\n- useState **bất đồng bộ** → setCount(prev => prev + 1)\n- useEffect với `[]` → chỉ chạy 1 lần (componentDidMount)\n- Cleanup function quan trọng để tránh memory leak',
        },
      ],
    },
  ];

  for (const c of convsData) {
    const existing = await Conversation.findOne({
      roomId: c.roomId,
      userId: c.userId,
      title: c.title,
    });
    if (!existing) {
      await Conversation.create(c);
      console.log(`  ✅ Tạo conversation: "${c.title}"`);
    } else {
      console.log(`  ⚠️  Conversation đã tồn tại: "${c.title}"`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════
  // 4. Tạo Quizzes
  // ═══════════════════════════════════════════════════════
  console.log('🧠 Tạo Quizzes...');

  const quizzesData = [
    {
      roomId: rooms[0]._id,
      topic: 'Logic mệnh đề cơ bản',
      createdBy: users[0]._id,
      questions: [
        {
          question: 'Mệnh đề "Nếu trời mưa thì đường ướt" có dạng logic nào?',
          options: ['p ∧ q', 'p → q', 'p ∨ q', 'p ↔ q'],
          correctIndex: 1,
          explanation: 'Câu "Nếu...thì..." là dạng kéo theo (implication) p → q',
        },
        {
          question: 'Phủ định của "Tất cả sinh viên đều chăm chỉ" là gì?',
          options: [
            'Tất cả sinh viên đều không chăm chỉ',
            'Có ít nhất một sinh viên không chăm chỉ',
            'Không có sinh viên nào chăm chỉ',
            'Một số sinh viên chăm chỉ',
          ],
          correctIndex: 1,
          explanation: 'Phủ định ∀x P(x) là ∃x ¬P(x) — "Tồn tại ít nhất một x không thỏa P"',
        },
        {
          question: 'p = TRUE, q = FALSE. Giá trị của p → q là?',
          options: ['TRUE', 'FALSE', 'Không xác định', 'NULL'],
          correctIndex: 1,
          explanation: 'p → q chỉ FALSE khi p = TRUE và q = FALSE. Đây chính là trường hợp đó.',
        },
        {
          question: 'Hai mệnh đề tương đương logic khi nào?',
          options: [
            'Khi cùng TRUE',
            'Khi cùng FALSE',
            'Khi có cùng bảng chân trị',
            'Khi có cùng số biến',
          ],
          correctIndex: 2,
          explanation: 'Hai mệnh đề tương đương logic (≡) khi bảng chân trị giống nhau hoàn toàn.',
        },
        {
          question: 'Phép toán nào KHÔNG phải phép toán logic cơ bản?',
          options: ['AND (∧)', 'MOD (%)', 'OR (∨)', 'NOT (¬)'],
          correctIndex: 1,
          explanation: 'MOD (%) là phép toán số học (phép chia lấy dư), không phải phép toán logic.',
        },
      ],
    },
    {
      roomId: rooms[1]._id,
      topic: 'JavaScript ES6+ Fundamentals',
      createdBy: users[1]._id,
      questions: [
        {
          question: 'Sự khác biệt chính giữa let và var là gì?',
          options: [
            'let nhanh hơn var',
            'let có block scope, var có function scope',
            'var mới hơn let',
            'Không có sự khác biệt',
          ],
          correctIndex: 1,
          explanation: 'let (ES6) có block scope {}, var có function scope. let không bị hoisting giá trị.',
        },
        {
          question: '`const arr = [1,2,3]; arr.push(4);` có lỗi không?',
          options: [
            'Có — const không cho phép thay đổi',
            'Không — const chỉ ngăn reassign, không ngăn mutate',
            'Có — mảng const không thể push',
            'Tùy browser',
          ],
          correctIndex: 1,
          explanation: 'const ngăn reassign (arr = [...]) nhưng KHÔNG ngăn mutate nội dung (arr.push, arr[0] = x).',
        },
        {
          question: 'Arrow function `() => {}` khác function thường ở điểm nào?',
          options: [
            'Chạy nhanh hơn',
            'Không có `this` riêng — kế thừa `this` từ scope cha',
            'Không nhận tham số',
            'Luôn return undefined',
          ],
          correctIndex: 1,
          explanation: 'Arrow function không tạo `this` context riêng, nó kế thừa `this` từ lexical scope bao ngoài.',
        },
        {
          question: 'Destructuring `const { a, b } = obj` dùng để làm gì?',
          options: [
            'Xóa property khỏi object',
            'Trích xuất property thành biến riêng',
            'Copy object',
            'Merge 2 objects',
          ],
          correctIndex: 1,
          explanation: 'Destructuring trích xuất giá trị từ object/array thành các biến riêng biệt, giúp code ngắn gọn hơn.',
        },
      ],
    },
  ];

  const quizzes = [];
  for (const q of quizzesData) {
    const existing = await Quiz.findOne({
      roomId: q.roomId,
      topic: q.topic,
    });
    if (!existing) {
      const quiz = await Quiz.create(q);
      quizzes.push(quiz);
      console.log(`  ✅ Tạo quiz: "${q.topic}" (${q.questions.length} câu)`);
    } else {
      quizzes.push(existing);
      console.log(`  ⚠️  Quiz đã tồn tại: "${q.topic}"`);
    }
  }

  // ═══════════════════════════════════════════════════════
  // 5. Tạo Quiz Results (bảng xếp hạng)
  // ═══════════════════════════════════════════════════════
  console.log('\n🏆 Tạo Quiz Results...');

  if (quizzes[0]) {
    const resultsData = [
      { quizId: quizzes[0]._id, userId: users[1]._id, score: 4, total: 5, answers: [1, 1, 1, 2, 0] },
      { quizId: quizzes[0]._id, userId: users[2]._id, score: 3, total: 5, answers: [1, 0, 1, 2, 1] },
    ];

    for (const r of resultsData) {
      const existing = await QuizResult.findOne({ quizId: r.quizId, userId: r.userId });
      if (!existing) {
        await QuizResult.create(r);
        const user = users.find((u) => u._id.toString() === r.userId.toString());
        console.log(`  ✅ ${user?.name}: ${r.score}/${r.total} điểm`);
      } else {
        console.log(`  ⚠️  Result đã tồn tại cho user ${r.userId}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 SEED HOÀN TẤT!');
  console.log('═'.repeat(50));
  console.log(`\n📊 Tổng kết:`);
  console.log(`  👤 Users:         ${users.length}`);
  console.log(`  🏠 Rooms:         ${rooms.length}`);
  console.log(`  💬 Conversations: ${convsData.length}`);
  console.log(`  🧠 Quizzes:       ${quizzes.length}`);
  console.log(`\n🔑 Tài khoản đăng nhập:`);
  for (const u of usersData) {
    console.log(`  📧 ${u.email} / 🔒 ${u.password}`);
  }
  console.log(`\n🏠 Mã mời phòng:`);
  for (const r of rooms) {
    console.log(`  #${r.inviteCode} → "${r.name}"`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Đã ngắt kết nối MongoDB.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Lỗi seed:', err.message);
  process.exit(1);
});
