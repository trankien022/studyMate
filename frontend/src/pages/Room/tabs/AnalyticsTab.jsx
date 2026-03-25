import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { quizAPI } from '../../../services/api';
import {
  BarChart3, Trophy, Target, TrendingUp,
  Brain, Calendar, Award, Zap
} from 'lucide-react';

export default function AnalyticsTab({ roomId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await quizAPI.getAnalytics(roomId);
      setAnalytics(data.data);
    } catch {
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="analytics-tab animate-fade-in">
        <div className="analytics-loading">
          <div className="spinner spinner-lg" />
          <p>Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-tab animate-fade-in">
        <div className="empty-state">
          <BarChart3 size={48} />
          <h3>Chưa có dữ liệu</h3>
          <p>Hoàn thành quiz để xem thống kê học tập!</p>
        </div>
      </div>
    );
  }

  const { overview, quizHistory, topPerformers, recentActivity } = analytics;

  // Build simple bar chart
  const maxScore = Math.max(...(quizHistory || []).map(q => q.percentage), 100);

  return (
    <div className="analytics-tab animate-fade-in">
      <div className="analytics-container">
        <div className="analytics-header">
          <h2>
            <BarChart3 size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Thống kê học tập
          </h2>
        </div>

        {/* Overview cards */}
        <div className="analytics-overview">
          <div className="analytics-card overview-card">
            <div className="overview-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary-500)' }}>
              <Brain size={24} />
            </div>
            <div className="overview-info">
              <span className="overview-value">{overview?.totalQuizzes || 0}</span>
              <span className="overview-label">Tổng quiz</span>
            </div>
          </div>

          <div className="analytics-card overview-card">
            <div className="overview-icon" style={{ background: 'rgba(52, 211, 153, 0.12)', color: 'var(--color-success)' }}>
              <Target size={24} />
            </div>
            <div className="overview-info">
              <span className="overview-value">{overview?.totalAttempts || 0}</span>
              <span className="overview-label">Lần làm bài</span>
            </div>
          </div>

          <div className="analytics-card overview-card">
            <div className="overview-icon" style={{ background: 'rgba(251, 191, 36, 0.12)', color: 'var(--color-warning)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="overview-info">
              <span className="overview-value">{overview?.avgScore || 0}%</span>
              <span className="overview-label">Điểm TB</span>
            </div>
          </div>

          <div className="analytics-card overview-card">
            <div className="overview-icon" style={{ background: 'rgba(96, 165, 250, 0.12)', color: 'var(--color-info)' }}>
              <Award size={24} />
            </div>
            <div className="overview-info">
              <span className="overview-value">{overview?.highestScore || 0}%</span>
              <span className="overview-label">Điểm cao nhất</span>
            </div>
          </div>
        </div>

        {/* Score chart */}
        {quizHistory && quizHistory.length > 0 && (
          <div className="analytics-card chart-card">
            <h3>
              <TrendingUp size={16} style={{ marginRight: 8 }} />
              Tiến độ điểm số
            </h3>
            <div className="chart-container">
              <div className="bar-chart">
                {quizHistory.map((quiz, i) => (
                  <div key={i} className="bar-column">
                    <div className="bar-value">{quiz.percentage}%</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          height: `${(quiz.percentage / maxScore) * 100}%`,
                          background: quiz.percentage >= 80
                            ? 'var(--color-success)'
                            : quiz.percentage >= 50
                            ? 'var(--color-warning)'
                            : 'var(--color-error)',
                        }}
                      />
                    </div>
                    <div className="bar-label" title={quiz.topic}>
                      {quiz.topic.length > 8 ? quiz.topic.substring(0, 8) + '…' : quiz.topic}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Two columns: Top Performers & Recent Activity */}
        <div className="analytics-grid-2">
          {/* Top performers */}
          {topPerformers && topPerformers.length > 0 && (
            <div className="analytics-card">
              <h3>
                <Trophy size={16} style={{ marginRight: 8, color: 'var(--color-warning)' }} />
                Bảng xếp hạng
              </h3>
              <div className="top-performers-list">
                {topPerformers.map((performer, i) => (
                  <div key={i} className="performer-item">
                    <span className={`performer-rank ${i < 3 ? 'top-3' : ''}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="avatar-circle avatar-sm">
                      {performer.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="performer-name">{performer.name}</span>
                    <span className="performer-score">{performer.avgScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {recentActivity && recentActivity.length > 0 && (
            <div className="analytics-card">
              <h3>
                <Calendar size={16} style={{ marginRight: 8 }} />
                Hoạt động gần đây
              </h3>
              <div className="activity-list">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="activity-item">
                    <div className={`activity-indicator ${
                      activity.percentage >= 80 ? 'success' : activity.percentage >= 50 ? 'warning' : 'error'
                    }`} />
                    <div className="activity-info">
                      <span className="activity-user">{activity.userName}</span>
                      <span className="activity-detail">
                        đạt {activity.score}/{activity.total} ({activity.percentage}%) trong "{activity.topic}"
                      </span>
                    </div>
                    <span className="activity-time">
                      {new Date(activity.submittedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
