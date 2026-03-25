const { UserBadge, BADGE_DEFINITIONS } = require('../models/Badge');
const Room = require('../models/Room');
const QuizResult = require('../models/QuizResult');
const Task = require('../models/Task');
const Conversation = require('../models/Conversation');
const DirectMessage = require('../models/DirectMessage');
const Document = require('../models/Document');
const {
  createNotification,
} = require('./notification.controller');

// ─── Cấu hình rarity (để hiển thị + XP) ────────────────────
const RARITY_CONFIG = {
  common: { label: 'Phổ biến', xp: 10, color: '#64748b' },
  rare: { label: 'Hiếm', xp: 25, color: '#3b82f6' },
  epic: { label: 'Sử thi', xp: 50, color: '#8b5cf6' },
  legendary: { label: 'Huyền thoại', xp: 100, color: '#f59e0b' },
};

// ─── GET /api/badges ────────────────────────────────────────
/**
 * GET /api/badges
 * Lấy toàn bộ huy hiệu + trạng thái của user hiện tại.
 */
const getAllBadges = async (req, res) => {
  const userId = req.user._id;

  // Lấy trạng thái badges đã lưu của user
  const userBadges = await UserBadge.find({ userId });
  const badgeMap = {};
  userBadges.forEach((ub) => {
    badgeMap[ub.badgeCode] = ub;
  });

  // Merge definitions + user state
  const badges = BADGE_DEFINITIONS.map((def) => {
    const userState = badgeMap[def.code];
    return {
      ...def,
      rarity_config: RARITY_CONFIG[def.rarity],
      progress: userState?.progress || 0,
      unlocked: userState?.unlocked || false,
      unlockedAt: userState?.unlockedAt || null,
    };
  });

  // Tính stats tổng quan
  const totalBadges = BADGE_DEFINITIONS.length;
  const unlockedCount = userBadges.filter((b) => b.unlocked).length;
  const totalXP = userBadges
    .filter((b) => b.unlocked)
    .reduce((sum, b) => {
      const def = BADGE_DEFINITIONS.find((d) => d.code === b.badgeCode);
      return sum + (RARITY_CONFIG[def?.rarity]?.xp || 0);
    }, 0);

  // Tính level dựa trên XP
  const level = Math.floor(totalXP / 50) + 1;
  const xpForNextLevel = level * 50;
  const xpProgress = totalXP % 50;

  res.json({
    success: true,
    data: {
      badges,
      stats: {
        totalBadges,
        unlockedCount,
        totalXP,
        level,
        xpForNextLevel,
        xpProgress,
        completionRate: Math.round((unlockedCount / totalBadges) * 100),
      },
    },
  });
};

// ─── GET /api/badges/recent ─────────────────────────────────
/**
 * GET /api/badges/recent
 * Lấy 5 huy hiệu mới nhất đã mở khóa.
 */
const getRecentBadges = async (req, res) => {
  const userId = req.user._id;

  const recentBadges = await UserBadge.find({
    userId,
    unlocked: true,
  })
    .sort({ unlockedAt: -1 })
    .limit(5);

  const badges = recentBadges.map((ub) => {
    const def = BADGE_DEFINITIONS.find((d) => d.code === ub.badgeCode);
    return {
      ...def,
      rarity_config: RARITY_CONFIG[def?.rarity],
      unlockedAt: ub.unlockedAt,
    };
  });

  res.json({
    success: true,
    data: { badges },
  });
};

// ─── POST /api/badges/check ─────────────────────────────────
/**
 * POST /api/badges/check
 * Kiểm tra và cập nhật tiến độ huy hiệu cho user.
 * Gọi sau mỗi action (tạo phòng, làm quiz, chat AI, v.v.)
 */
const checkAndUpdateBadges = async (req, res) => {
  const userId = req.user._id;

  const newlyUnlocked = await processAllBadges(userId);

  res.json({
    success: true,
    message:
      newlyUnlocked.length > 0
        ? `Chúc mừng! Bạn đã mở khóa ${newlyUnlocked.length} huy hiệu mới!`
        : 'Không có huy hiệu mới',
    data: { newlyUnlocked },
  });
};

// ─── Logic kiểm tra & mở khóa huy hiệu ─────────────────────
/**
 * Hàm chính: Duyệt qua tất cả badge definitions,
 * tính toán progress từ DB, mở khóa nếu đạt threshold.
 * @returns {Array} Danh sách badges vừa được mở khóa
 */
const processAllBadges = async (userId) => {
  const newlyUnlocked = [];

  // Thu thập tất cả dữ liệu cần thiết (1 batch query)
  const [
    roomsOwned,
    roomsJoined,
    quizResults,
    aiConversations,
    tasksCreated,
    tasksCompleted,
    dmSent,
    docsAnalyzed,
  ] = await Promise.all([
    Room.countDocuments({ owner: userId }),
    Room.countDocuments({ members: userId }),
    QuizResult.find({ userId }).sort({ createdAt: -1 }),
    Conversation.countDocuments({ userId }),
    Task.countDocuments({ createdBy: userId }),
    Task.countDocuments({
      $or: [{ createdBy: userId }, { assignees: userId }],
      status: 'done',
    }),
    DirectMessage.countDocuments({ sender: userId }),
    Document.countDocuments({ uploadedBy: userId, status: 'analyzed' }),
  ]);

  // Tính các metric phái sinh
  const quizzesCompleted = quizResults.length;
  const perfectQuizzes = quizResults.filter(
    (r) => r.score === r.total
  ).length;

  // Tính high streak (liên tiếp >= 80%)
  let highStreak = 0;
  let maxHighStreak = 0;
  for (const result of quizResults) {
    if (result.total > 0 && result.score / result.total >= 0.8) {
      highStreak++;
      maxHighStreak = Math.max(maxHighStreak, highStreak);
    } else {
      highStreak = 0;
    }
  }

  // Kiểm tra hoạt động sáng sớm / đêm khuya
  const now = new Date();
  const hour = now.getHours();
  const isEarlyBird = hour >= 5 && hour < 7;
  const isNightOwl = hour >= 23 || hour < 2;

  // Map điều kiện → giá trị hiện tại
  const conditionValues = {
    rooms_created: roomsOwned,
    rooms_joined: roomsJoined,
    quizzes_completed: quizzesCompleted,
    perfect_quiz: perfectQuizzes,
    high_streak: maxHighStreak,
    ai_chats: aiConversations,
    notes_written: roomsJoined > 0 ? 1 : 0, // simplified check
    documents_analyzed: docsAnalyzed,
    tasks_created: tasksCreated,
    tasks_completed: tasksCompleted,
    dm_sent: dmSent,
    early_activity: isEarlyBird ? 1 : 0,
    late_activity: isNightOwl ? 1 : 0,
    premium_upgrade: 0, // Được xử lý riêng khi nâng cấp
  };

  // Duyệt từng badge definition
  for (const def of BADGE_DEFINITIONS) {
    const currentValue = conditionValues[def.condition.type] || 0;

    // Upsert: tạo hoặc cập nhật tiến độ
    const userBadge = await UserBadge.findOneAndUpdate(
      { userId, badgeCode: def.code },
      {
        $set: {
          progress: Math.min(currentValue, def.condition.threshold),
        },
      },
      { upsert: true, new: true }
    );

    // Kiểm tra mở khóa
    if (
      !userBadge.unlocked &&
      currentValue >= def.condition.threshold
    ) {
      userBadge.unlocked = true;
      userBadge.unlockedAt = new Date();
      await userBadge.save();

      newlyUnlocked.push({
        code: def.code,
        name: def.name,
        icon: def.icon,
        description: def.description,
        rarity: def.rarity,
        rarity_config: RARITY_CONFIG[def.rarity],
      });

      // 🔔 Gửi notification
      createNotification(userId, {
        type: 'badge_unlocked',
        title: 'Huy hiệu mới!',
        message: `Bạn đã mở khóa huy hiệu "${def.name}" — ${def.description}`,
        link: '/profile',
        metadata: { badgeCode: def.code, rarity: def.rarity },
      }).catch((err) =>
        console.error('[Notification] Badge error:', err.message)
      );
    }
  }

  return newlyUnlocked;
};

// ─── Hàm tiện ích: Gọi từ các controller khác ──────────────
/**
 * Trigger kiểm tra badge sau một hành động cụ thể.
 * Gọi non-blocking (fire-and-forget) để không ảnh hưởng UX.
 */
const triggerBadgeCheck = (userId) => {
  processAllBadges(userId).catch((err) =>
    console.error('[Badge] Check error:', err.message)
  );
};

/**
 * Unlock badge đặc biệt (premium, early_bird, v.v.)
 * @param {string} userId
 * @param {string} badgeCode
 */
const unlockSpecialBadge = async (userId, badgeCode) => {
  const def = BADGE_DEFINITIONS.find((d) => d.code === badgeCode);
  if (!def) return;

  const result = await UserBadge.findOneAndUpdate(
    { userId, badgeCode },
    {
      $set: {
        progress: def.condition.threshold,
        unlocked: true,
        unlockedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  if (result) {
    createNotification(userId, {
      type: 'badge_unlocked',
      title: 'Huy hiệu mới!',
      message: `Bạn đã mở khóa huy hiệu "${def.name}" — ${def.description}`,
      link: '/profile',
      metadata: { badgeCode: def.code, rarity: def.rarity },
    }).catch((err) =>
      console.error('[Notification] Special badge error:', err.message)
    );
  }

  return result;
};

module.exports = {
  getAllBadges,
  getRecentBadges,
  checkAndUpdateBadges,
  triggerBadgeCheck,
  unlockSpecialBadge,
  processAllBadges,
};
