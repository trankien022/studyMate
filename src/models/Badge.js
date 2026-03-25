const mongoose = require('mongoose');

// ─── Định nghĩa tất cả huy hiệu trong hệ thống ────────────
const BADGE_DEFINITIONS = [
  // ─── Phòng học ────────────────────────────────────────
  {
    code: 'first_room',
    name: 'Người tiên phong',
    description: 'Tạo phòng học đầu tiên',
    icon: '🏠',
    category: 'room',
    rarity: 'common',
    condition: { type: 'rooms_created', threshold: 1 },
  },
  {
    code: 'room_master',
    name: 'Chuyên gia tổ chức',
    description: 'Tạo 5 phòng học',
    icon: '🏫',
    category: 'room',
    rarity: 'rare',
    condition: { type: 'rooms_created', threshold: 5 },
  },
  {
    code: 'social_butterfly',
    name: 'Bướm xã hội',
    description: 'Tham gia 3 phòng học khác nhau',
    icon: '🦋',
    category: 'room',
    rarity: 'common',
    condition: { type: 'rooms_joined', threshold: 3 },
  },
  {
    code: 'community_builder',
    name: 'Xây dựng cộng đồng',
    description: 'Tham gia 10 phòng học',
    icon: '🌐',
    category: 'room',
    rarity: 'epic',
    condition: { type: 'rooms_joined', threshold: 10 },
  },

  // ─── Quiz ─────────────────────────────────────────────
  {
    code: 'first_quiz',
    name: 'Bước đầu tiên',
    description: 'Hoàn thành quiz đầu tiên',
    icon: '📝',
    category: 'quiz',
    rarity: 'common',
    condition: { type: 'quizzes_completed', threshold: 1 },
  },
  {
    code: 'quiz_enthusiast',
    name: 'Đam mê kiến thức',
    description: 'Hoàn thành 10 bài quiz',
    icon: '🧠',
    category: 'quiz',
    rarity: 'rare',
    condition: { type: 'quizzes_completed', threshold: 10 },
  },
  {
    code: 'quiz_master',
    name: 'Bậc thầy quiz',
    description: 'Hoàn thành 50 bài quiz',
    icon: '🎓',
    category: 'quiz',
    rarity: 'legendary',
    condition: { type: 'quizzes_completed', threshold: 50 },
  },
  {
    code: 'perfect_score',
    name: 'Điểm tuyệt đối',
    description: 'Đạt 100% trong một bài quiz',
    icon: '💯',
    category: 'quiz',
    rarity: 'rare',
    condition: { type: 'perfect_quiz', threshold: 1 },
  },
  {
    code: 'high_achiever',
    name: 'Thành tích cao',
    description: 'Đạt trên 80% trong 5 bài quiz liên tiếp',
    icon: '⭐',
    category: 'quiz',
    rarity: 'epic',
    condition: { type: 'high_streak', threshold: 5 },
  },

  // ─── AI Chat ──────────────────────────────────────────
  {
    code: 'ai_explorer',
    name: 'Khám phá AI',
    description: 'Trò chuyện với AI lần đầu',
    icon: '🤖',
    category: 'ai',
    rarity: 'common',
    condition: { type: 'ai_chats', threshold: 1 },
  },
  {
    code: 'ai_power_user',
    name: 'Người dùng AI chuyên nghiệp',
    description: 'Gửi 50 tin nhắn cho AI',
    icon: '⚡',
    category: 'ai',
    rarity: 'rare',
    condition: { type: 'ai_chats', threshold: 50 },
  },

  // ─── Ghi chú & Tài liệu ──────────────────────────────
  {
    code: 'note_taker',
    name: 'Ghi chú viên',
    description: 'Viết ghi chú trong phòng học',
    icon: '📓',
    category: 'notes',
    rarity: 'common',
    condition: { type: 'notes_written', threshold: 1 },
  },
  {
    code: 'document_analyst',
    name: 'Nhà phân tích',
    description: 'Upload và phân tích 5 tài liệu',
    icon: '📊',
    category: 'documents',
    rarity: 'rare',
    condition: { type: 'documents_analyzed', threshold: 5 },
  },

  // ─── Task Board ───────────────────────────────────────
  {
    code: 'task_starter',
    name: 'Khởi đầu công việc',
    description: 'Tạo công việc đầu tiên',
    icon: '📋',
    category: 'tasks',
    rarity: 'common',
    condition: { type: 'tasks_created', threshold: 1 },
  },
  {
    code: 'task_finisher',
    name: 'Hoàn thành xuất sắc',
    description: 'Hoàn thành 10 công việc',
    icon: '✅',
    category: 'tasks',
    rarity: 'rare',
    condition: { type: 'tasks_completed', threshold: 10 },
  },

  // ─── Social ───────────────────────────────────────────
  {
    code: 'first_message',
    name: 'Kết nối đầu tiên',
    description: 'Gửi tin nhắn trực tiếp đầu tiên',
    icon: '💬',
    category: 'social',
    rarity: 'common',
    condition: { type: 'dm_sent', threshold: 1 },
  },

  // ─── Đặc biệt ────────────────────────────────────────
  {
    code: 'early_bird',
    name: 'Chim sớm',
    description: 'Học vào lúc 5-7 giờ sáng',
    icon: '🌅',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'early_activity', threshold: 1 },
  },
  {
    code: 'night_owl',
    name: 'Cú đêm',
    description: 'Học vào lúc 11 giờ tối - 2 giờ sáng',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'late_activity', threshold: 1 },
  },
  {
    code: 'premium_member',
    name: 'Thành viên Premium',
    description: 'Nâng cấp tài khoản Premium',
    icon: '👑',
    category: 'special',
    rarity: 'epic',
    condition: { type: 'premium_upgrade', threshold: 1 },
  },
];

// ─── Schema lưu trạng thái huy hiệu của user ───────────────
const userBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Code huy hiệu (unique per user)
    badgeCode: {
      type: String,
      required: [true, 'Mã huy hiệu không được để trống'],
      enum: BADGE_DEFINITIONS.map((b) => b.code),
    },

    // Tiến độ hiện tại
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Đã mở khóa chưa
    unlocked: {
      type: Boolean,
      default: false,
    },

    // Thời điểm mở khóa
    unlockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Mỗi user chỉ có 1 bản ghi cho mỗi badge
userBadgeSchema.index({ userId: 1, badgeCode: 1 }, { unique: true });

// ─── Loại bỏ __v ────────────────────────────────────────────
userBadgeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const UserBadge = mongoose.model('UserBadge', userBadgeSchema);

module.exports = { UserBadge, BADGE_DEFINITIONS };
