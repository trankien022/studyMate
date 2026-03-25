/**
 * Check data — Kiểm tra dữ liệu trong database
 * Chạy: npm run check-data
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
const User = require('./src/models/User');
const Room = require('./src/models/Room');
const Conversation = require('./src/models/Conversation');
const Quiz = require('./src/models/Quiz');
const QuizResult = require('./src/models/QuizResult');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({}, 'name email');
  console.log(`\nUSERS (${users.length}):`);
  users.forEach((u) => console.log(`  - ${u.name} | ${u.email}`));

  const rooms = await Room.find({}, 'name subject inviteCode members');
  console.log(`\nROOMS (${rooms.length}):`);
  rooms.forEach((r) => console.log(`  - ${r.name} | ${r.subject} | #${r.inviteCode} | ${r.members.length} members`));

  const convs = await Conversation.find({}, 'title messages');
  console.log(`\nCONVERSATIONS (${convs.length}):`);
  convs.forEach((c) => console.log(`  - "${c.title}" (${c.messages.length} msgs)`));

  const quizzes = await Quiz.find({}, 'topic questions');
  console.log(`\nQUIZZES (${quizzes.length}):`);
  quizzes.forEach((q) => console.log(`  - "${q.topic}" (${q.questions.length} questions)`));

  const results = await QuizResult.find({}).populate('userId', 'name');
  console.log(`\nQUIZ RESULTS (${results.length}):`);
  results.forEach((r) => console.log(`  - ${r.userId?.name}: ${r.score}/${r.total}`));

  await mongoose.disconnect();
  process.exit(0);
})();
