import { useState, useEffect, useCallback } from 'react';
import { badgeAPI } from '../../services/api';
import {
  Award, Trophy, Star, Lock, Sparkles,
  ChevronRight, TrendingUp, Zap, Filter
} from 'lucide-react';
import './BadgeShowcase.css';

import {
  Book, FileText, Bot, Notebook, FileBarChart, CheckSquare, MessageCircle, StarIcon
} from 'lucide-react';

// ─── Cấu hình hiển thị cho category ────────────────────────
const CATEGORY_CONFIG = {
  room: { label: 'Phòng học', icon: <Book size={14} /> },
  quiz: { label: 'Quiz', icon: <FileText size={14} /> },
  ai: { label: 'AI', icon: <Bot size={14} /> },
  notes: { label: 'Ghi chú', icon: <Notebook size={14} /> },
  documents: { label: 'Tài liệu', icon: <FileBarChart size={14} /> },
  tasks: { label: 'Công việc', icon: <CheckSquare size={14} /> },
  social: { label: 'Mạng xã hội', icon: <MessageCircle size={14} /> },
  special: { label: 'Đặc biệt', icon: <StarIcon size={14} /> },
};

// ─── Compact badge component cho Dashboard ──────────────────
export function BadgeSummary({ onClick }) {
  const [stats, setStats] = useState(null);
  const [recentBadges, setRecentBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allRes, recentRes] = await Promise.all([
          badgeAPI.getAll(),
          badgeAPI.getRecent(),
        ]);
        setStats(allRes.data.data.stats);
        setRecentBadges(recentRes.data.data.badges);
      } catch {
        // Không làm gì — fallback UI xử lý
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="badge-summary-skeleton">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 10, width: '80%' }} />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <button className="badge-summary-card" onClick={onClick} type="button">
      <div className="badge-summary-left">
        <div className="badge-level-circle">
          <Trophy size={18} />
          <span className="badge-level-num">Lv.{stats.level}</span>
        </div>
        <div className="badge-summary-info">
          <span className="badge-summary-title">
            {stats.unlockedCount}/{stats.totalBadges} huy hiệu
          </span>
          <div className="badge-xp-bar">
            <div
              className="badge-xp-fill"
              style={{ width: `${(stats.xpProgress / 50) * 100}%` }}
            />
          </div>
          <span className="badge-xp-label">{stats.totalXP} XP</span>
        </div>
      </div>
      <div className="badge-summary-recent">
        {recentBadges.slice(0, 3).map((b) => (
          <span
            key={b.code}
            className={`badge-mini badge-rarity-${b.rarity}`}
            title={b.name}
          >
            {b.icon}
          </span>
        ))}
        <ChevronRight size={16} className="badge-summary-arrow" />
      </div>
    </button>
  );
}

// ─── Full BadgeShowcase component cho Profile page ───────────
export default function BadgeShowcase() {
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [checking, setChecking] = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  const fetchBadges = useCallback(async () => {
    try {
      const { data: res } = await badgeAPI.getAll();
      setBadges(res.data.badges);
      setStats(res.data.stats);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Kiểm tra & cập nhật badges mới
  const handleCheckBadges = async () => {
    setChecking(true);
    setNewBadges([]);
    try {
      const { data: res } = await badgeAPI.check();
      if (res.data.newlyUnlocked.length > 0) {
        setNewBadges(res.data.newlyUnlocked);
      }
      await fetchBadges(); // Reload dữ liệu
    } catch {
      // Ignore
    } finally {
      setChecking(false);
    }
  };

  // Lọc badges
  const categories = ['all', ...new Set(badges.map((b) => b.category))];
  const filteredBadges =
    filter === 'all' ? badges : badges.filter((b) => b.category === filter);

  // Sắp xếp: unlocked trước, rồi theo rarity
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sortedBadges = [...filteredBadges].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return (rarityOrder[a.rarity] || 4) - (rarityOrder[b.rarity] || 4);
  });

  if (loading) {
    return (
      <div className="badge-showcase-loading">
        <div className="spinner spinner-lg" />
        <p>Đang tải huy hiệu...</p>
      </div>
    );
  }

  return (
    <section className="badge-showcase" aria-label="Huy hiệu & Thành tích">
      {/* Header */}
      <div className="badge-showcase-header">
        <div className="badge-header-left">
          <Award size={22} />
          <h2>Huy hiệu & Thành tích</h2>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleCheckBadges}
          disabled={checking}
        >
          {checking ? <span className="spinner" /> : <TrendingUp size={15} />}
          Kiểm tra thành tích
        </button>
      </div>

      {/* Newly Unlocked Toast */}
      {newBadges.length > 0 && (
        <div className="badge-unlock-toast animate-zoom-in">
          <Sparkles size={18} />
          <div className="badge-unlock-content">
            <strong>Chúc mừng! Bạn vừa mở khóa:</strong>
            <div className="badge-unlock-list">
              {newBadges.map((b) => (
                <span key={b.code} className={`badge-unlock-item badge-rarity-${b.rarity}`}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="badge-stats-row">
          <div className="badge-stat-card">
            <div className="badge-stat-icon badge-stat-level">
              <Trophy size={18} />
            </div>
            <div className="badge-stat-info">
              <span className="badge-stat-value">Level {stats.level}</span>
              <div className="badge-xp-bar badge-xp-bar-lg">
                <div
                  className="badge-xp-fill"
                  style={{ width: `${(stats.xpProgress / 50) * 100}%` }}
                />
              </div>
              <span className="badge-stat-sub">
                {stats.xpProgress}/{stats.xpForNextLevel - (stats.level - 1) * 50} XP
              </span>
            </div>
          </div>

          <div className="badge-stat-card">
            <div className="badge-stat-icon badge-stat-collected">
              <Award size={18} />
            </div>
            <div className="badge-stat-info">
              <span className="badge-stat-value">{stats.unlockedCount}</span>
              <span className="badge-stat-sub">/ {stats.totalBadges} đã mở</span>
            </div>
          </div>

          <div className="badge-stat-card">
            <div className="badge-stat-icon badge-stat-xp">
              <Zap size={18} />
            </div>
            <div className="badge-stat-info">
              <span className="badge-stat-value">{stats.totalXP}</span>
              <span className="badge-stat-sub">Tổng XP</span>
            </div>
          </div>

          <div className="badge-stat-card">
            <div className="badge-stat-icon badge-stat-rate">
              <Star size={18} />
            </div>
            <div className="badge-stat-info">
              <span className="badge-stat-value">{stats.completionRate}%</span>
              <span className="badge-stat-sub">Hoàn thành</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="badge-filter-row">
        <Filter size={14} />
        {categories.map((cat) => (
          <button
            key={cat}
            className={`badge-filter-chip ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            {cat === 'all' ? (
              'Tất cả'
            ) : (
              <>
                {CATEGORY_CONFIG[cat]?.icon}
                <span>{CATEGORY_CONFIG[cat]?.label || cat}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="badge-grid">
        {sortedBadges.map((badge) => (
          <div
            key={badge.code}
            className={`badge-card ${badge.unlocked ? 'unlocked' : 'locked'} badge-rarity-${badge.rarity}`}
          >
            {/* Rarity glow */}
            {badge.unlocked && (
              <div className={`badge-glow badge-glow-${badge.rarity}`} />
            )}

            <div className="badge-card-icon">
              {badge.unlocked ? (
                <span className="badge-emoji">{badge.icon}</span>
              ) : (
                <Lock size={24} className="badge-lock-icon" />
              )}
            </div>

            <h4 className="badge-card-name">{badge.name}</h4>
            <p className="badge-card-desc">{badge.description}</p>

            {/* Progress bar */}
            <div className="badge-progress-section">
              <div className="badge-progress-bar">
                <div
                  className="badge-progress-fill"
                  style={{
                    width: `${Math.min((badge.progress / badge.condition.threshold) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="badge-progress-text">
                {badge.progress}/{badge.condition.threshold}
              </span>
            </div>

            {/* Rarity label */}
            <span
              className="badge-rarity-label"
              style={{ color: badge.rarity_config?.color }}
            >
              {badge.rarity_config?.label}
              {badge.unlocked && ` • ${badge.rarity_config?.xp} XP`}
            </span>

            {/* Unlock date */}
            {badge.unlocked && badge.unlockedAt && (
              <span className="badge-unlock-date">
                Mở khóa: {new Date(badge.unlockedAt).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
