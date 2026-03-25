import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tutorAPI } from '../../services/api';
import {
  GraduationCap, ArrowLeft, Send, Plus, Trash2, Settings2,
  BookOpen, Brain, Target, MessageSquare, BarChart3, Clock,
  CheckCircle, Archive, Sparkles, Eye, ListOrdered, Code2,
  HelpCircle, ChevronRight, X, Award, TrendingUp,
  Lightbulb, AlertCircle, RefreshCw,
} from 'lucide-react';
import './AITutor.css';

// ─── Constants ──────────────────────────────────────────────
const DIFFICULTY_LABELS = {
  beginner: { label: 'Cơ bản', icon: '🌱' },
  intermediate: { label: 'Trung bình', icon: '📚' },
  advanced: { label: 'Nâng cao', icon: '🚀' },
};

const STYLE_OPTIONS = [
  { value: 'visual', label: 'Trực quan', icon: '🎨', desc: 'Sơ đồ & hình ảnh' },
  { value: 'step-by-step', label: 'Từng bước', icon: '📝', desc: 'Hướng dẫn chi tiết' },
  { value: 'examples', label: 'Ví dụ', icon: '💡', desc: 'Học qua ví dụ' },
  { value: 'socratic', label: 'Socratic', icon: '🤔', desc: 'Hỏi đáp gợi mở' },
];

export default function AITutorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'sessions' | 'stats'
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [completeSummary, setCompleteSummary] = useState(null);

  // ─── Form state cho phiên mới ───────────────────────────
  const [newForm, setNewForm] = useState({
    subject: '',
    topic: '',
    difficulty: 'intermediate',
    learningStyle: 'step-by-step',
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Fetch Sessions ────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const params = {};
      if (sessionFilter !== 'all') params.status = sessionFilter;
      const { data } = await tutorAPI.getSessions(params);
      setSessions(data.data.sessions || []);
    } catch {
      setError('Không thể tải danh sách phiên học');
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionFilter]);

  // ─── Fetch Stats ───────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await tutorAPI.getStats();
      setStats(data.data);
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
  }, [activeTab, fetchStats]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // ─── Create Session ────────────────────────────────────
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newForm.subject.trim()) {
      setError('Vui lòng nhập môn học');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await tutorAPI.createSession(newForm);
      const session = data.data.session;
      setActiveSession(session);
      setShowNewSession(false);
      setNewForm({ subject: '', topic: '', difficulty: 'intermediate', learningStyle: 'step-by-step' });
      setActiveTab('chat');
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo phiên học thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ─── Open Session ──────────────────────────────────────
  const openSession = async (sessionId) => {
    setLoading(true);
    try {
      const { data } = await tutorAPI.getSession(sessionId);
      setActiveSession(data.data.session);
      setActiveTab('chat');
      setCompleteSummary(null);
    } catch {
      setError('Không thể mở phiên học');
    } finally {
      setLoading(false);
    }
  };

  // ─── Send Message ──────────────────────────────────────
  const handleSendMessage = async (text) => {
    const msg = text || message.trim();
    if (!msg || !activeSession || chatLoading) return;

    // Optimistic update
    const userMsg = { role: 'user', content: msg, timestamp: new Date() };
    setActiveSession((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), userMsg],
    }));
    setMessage('');
    setChatLoading(true);

    try {
      const { data } = await tutorAPI.chat(activeSession._id, msg);
      const aiMsg = { role: 'assistant', content: data.data.message.content, timestamp: new Date() };
      setActiveSession((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), aiMsg],
        questionsAsked: data.data.questionsAsked,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi tin nhắn');
      // Rollback
      setActiveSession((prev) => ({
        ...prev,
        messages: (prev.messages || []).slice(0, -1),
      }));
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  };

  // ─── Update Config ─────────────────────────────────────
  const handleUpdateConfig = async (key, value) => {
    if (!activeSession) return;
    try {
      await tutorAPI.updateConfig(activeSession._id, { [key]: value });
      setActiveSession((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật');
    }
  };

  // ─── Complete Session ──────────────────────────────────
  const handleCompleteSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const { data } = await tutorAPI.completeSession(activeSession._id);
      setActiveSession((prev) => ({ ...prev, status: 'completed' }));
      setCompleteSummary(data.data.summary);
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kết thúc phiên');
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete Session ────────────────────────────────────
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await tutorAPI.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSession?._id === sessionId) {
        setActiveSession(null);
        setCompleteSummary(null);
      }
    } catch {
      setError('Không thể xóa phiên học');
    }
  };

  // ─── Key handler ───────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── Render Helpers ────────────────────────────────────
  const getMasteryClass = (level) => {
    if (level >= 70) return 'high';
    if (level >= 40) return 'medium';
    return 'low';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // ─── Render: New Session Form ──────────────────────────
  const renderNewSessionForm = () => (
    <div className="new-session-card">
      <h2>
        <Sparkles size={22} />
        Bắt đầu phiên học mới
      </h2>
      <p>Cá nhân hóa trải nghiệm học tập của bạn — chọn môn học, mức độ khó và phong cách dạy phù hợp.</p>

      {error && <div className="auth-error" style={{ marginBottom: '1rem' }}><AlertCircle size={14} /> {error}</div>}

      <form onSubmit={handleCreateSession} id="new-tutor-session-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tutor-subject">Môn học <span className="required">*</span></label>
            <input
              id="tutor-subject"
              type="text"
              className="input"
              placeholder="VD: Cấu trúc dữ liệu & Giải thuật"
              value={newForm.subject}
              onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tutor-topic">Chủ đề cụ thể</label>
            <input
              id="tutor-topic"
              type="text"
              className="input"
              placeholder="VD: Cây nhị phân tìm kiếm"
              value={newForm.topic}
              onChange={(e) => setNewForm({ ...newForm, topic: e.target.value })}
              maxLength={100}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tutor-difficulty">Mức độ</label>
          <select
            id="tutor-difficulty"
            value={newForm.difficulty}
            onChange={(e) => setNewForm({ ...newForm, difficulty: e.target.value })}
          >
            {Object.entries(DIFFICULTY_LABELS).map(([val, { label, icon }]) => (
              <option key={val} value={val}>{icon} {label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Phong cách dạy</label>
          <div className="style-picker">
            {STYLE_OPTIONS.map((style) => (
              <div
                key={style.value}
                className={`style-option ${newForm.learningStyle === style.value ? 'selected' : ''}`}
                onClick={() => setNewForm({ ...newForm, learningStyle: style.value })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setNewForm({ ...newForm, learningStyle: style.value })}
              >
                <span className="style-option-icon">{style.icon}</span>
                <span className="style-option-label">{style.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setShowNewSession(false)}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : <><GraduationCap size={16} /> Bắt đầu học</>}
          </button>
        </div>
      </form>
    </div>
  );

  // ─── Render: Chat Interface ────────────────────────────
  const renderChat = () => {
    if (!activeSession) {
      return (
        <div className="tutor-empty">
          <GraduationCap size={56} />
          <h3>Chào mừng bạn đến AI Tutor!</h3>
          <p>Chọn một phiên học có sẵn hoặc tạo phiên mới để bắt đầu học với gia sư AI cá nhân hóa.</p>
          <button className="btn btn-primary" onClick={() => setShowNewSession(true)}>
            <Plus size={16} /> Tạo phiên học mới
          </button>
        </div>
      );
    }

    // Hiển thị report nếu vừa complete
    if (completeSummary) {
      return renderReport();
    }

    const messages = activeSession.messages || [];
    const isActive = activeSession.status === 'active';

    // Gợi ý câu hỏi cho phiên mới
    const hints = [
      `Giải thích ${activeSession.topic || activeSession.subject} cho tôi`,
      `Tóm tắt kiến thức cơ bản về ${activeSession.subject}`,
      `Cho tôi bài tập về ${activeSession.topic || activeSession.subject}`,
      'Kiểm tra hiểu biết của tôi',
    ];

    return (
      <div className="chat-container">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <h3>
              <GraduationCap size={18} />
              {activeSession.title || activeSession.subject}
            </h3>
            <span className="chat-subject-badge">
              <BookOpen size={11} />
              {activeSession.subject}
              {activeSession.topic && ` • ${activeSession.topic}`}
              {' • '}
              {DIFFICULTY_LABELS[activeSession.difficulty]?.icon} {DIFFICULTY_LABELS[activeSession.difficulty]?.label}
            </span>
          </div>
          <div className="chat-header-actions">
            {isActive && (
              <>
                <button
                  className="config-btn"
                  onClick={() => setShowConfig(!showConfig)}
                  title="Tùy chỉnh cá nhân hóa"
                >
                  <Settings2 size={14} />
                  Tùy chỉnh
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleCompleteSession}
                  disabled={loading}
                  title="Kết thúc phiên học"
                >
                  <CheckCircle size={14} />
                  Kết thúc
                </button>
              </>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => { setActiveSession(null); setCompleteSummary(null); }}
              title="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && isActive && (
          <div className="config-panel">
            <h4><Settings2 size={14} /> Cá nhân hóa</h4>
            <div className="form-group">
              <label>Mức độ</label>
              <select
                value={activeSession.difficulty}
                onChange={(e) => handleUpdateConfig('difficulty', e.target.value)}
              >
                {Object.entries(DIFFICULTY_LABELS).map(([val, { label, icon }]) => (
                  <option key={val} value={val}>{icon} {label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Phong cách dạy</label>
              <select
                value={activeSession.learningStyle}
                onChange={(e) => handleUpdateConfig('learningStyle', e.target.value)}
              >
                {STYLE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Chủ đề</label>
              <input
                type="text"
                className="input"
                value={activeSession.topic || ''}
                onChange={(e) => handleUpdateConfig('topic', e.target.value)}
                placeholder="Cập nhật chủ đề..."
              />
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowConfig(false)}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Đóng
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">🎓</div>
              <h3>Sẵn sàng học!</h3>
              <p>
                Gia sư AI chuyên về <strong>{activeSession.subject}</strong> đang chờ bạn.
                Hãy hỏi bất cứ điều gì!
              </p>
              <div className="chat-welcome-hints">
                {hints.map((hint, i) => (
                  <button
                    key={i}
                    className="hint-chip"
                    onClick={() => handleSendMessage(hint)}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <div className={`msg-avatar ${msg.role === 'assistant' ? 'tutor' : 'student'}`}>
                  {msg.role === 'assistant' ? <GraduationCap size={16} /> : user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            ))
          )}

          {chatLoading && (
            <div className="typing-indicator">
              <div className="msg-avatar tutor"><GraduationCap size={16} /></div>
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isActive && (
          <div className="chat-input-area">
            <form className="chat-input-form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi gia sư AI bất cứ điều gì..."
                  rows={1}
                  disabled={chatLoading}
                />
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!message.trim() || chatLoading}
                title="Gửi tin nhắn"
              >
                {chatLoading ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Session Report ────────────────────────────
  const renderReport = () => {
    if (!completeSummary) return null;

    return (
      <div className="report-card">
        <div className="report-header">
          <div className="report-header-icon">
            <Award size={24} />
          </div>
          <div>
            <h3>Báo cáo phiên học</h3>
            <p>{activeSession?.subject} {activeSession?.topic && `• ${activeSession.topic}`}</p>
          </div>
        </div>

        {/* Mastery */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className={`mastery-badge ${getMasteryClass(completeSummary.masteryLevel)}`} style={{ fontSize: '1.5rem', padding: '0.75rem 2rem', display: 'inline-flex' }}>
            <Target size={20} />
            {completeSummary.masteryLevel}% nắm vững
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontSize: 'var(--text-sm)' }}>
            {completeSummary.summary}
          </p>
        </div>

        <div className="report-grid">
          {/* Điểm mạnh */}
          {completeSummary.strengths?.length > 0 && (
            <div className="report-section">
              <h4><TrendingUp size={16} style={{ color: 'var(--color-success)' }} /> Điểm mạnh</h4>
              <ul className="report-list">
                {completeSummary.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Điểm cần cải thiện */}
          {completeSummary.weaknesses?.length > 0 && (
            <div className="report-section">
              <h4><AlertCircle size={16} style={{ color: 'var(--color-warning)' }} /> Cần cải thiện</h4>
              <ul className="report-list">
                {completeSummary.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Concepts */}
          {completeSummary.conceptsCovered?.length > 0 && (
            <div className="report-section">
              <h4><Brain size={16} style={{ color: 'var(--color-primary-500)' }} /> Khái niệm đã học</h4>
              <ul className="report-list">
                {completeSummary.conceptsCovered.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {/* Next steps */}
          {completeSummary.nextSteps?.length > 0 && (
            <div className="report-section">
              <h4><Lightbulb size={16} style={{ color: 'var(--color-accent-mid)' }} /> Bước tiếp theo</h4>
              <ul className="report-list">
                {completeSummary.nextSteps.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '2rem' }}>
          <button className="btn btn-ghost" onClick={() => { setActiveSession(null); setCompleteSummary(null); }}>
            Quay lại
          </button>
          <button className="btn btn-primary" onClick={() => { setActiveSession(null); setCompleteSummary(null); setShowNewSession(true); }}>
            <Plus size={16} /> Phiên học mới
          </button>
        </div>
      </div>
    );
  };

  // ─── Render: Sessions Tab ──────────────────────────────
  const renderSessions = () => (
    <div className="sessions-list">
      <div className="sessions-toolbar">
        <div className="sessions-filter">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${sessionFilter === f ? 'active' : ''}`}
              onClick={() => setSessionFilter(f)}
            >
              {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang học' : 'Hoàn thành'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewSession(true)}>
          <Plus size={14} /> Phiên mới
        </button>
      </div>

      {sessionsLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="session-card" style={{ opacity: 0.5 }}>
            <div className="session-card-left">
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 8 }} />
              <div>
                <div className="skeleton" style={{ width: 180, height: 16, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 120, height: 12 }} />
              </div>
            </div>
          </div>
        ))
      ) : sessions.length === 0 ? (
        <div className="tutor-empty">
          <BookOpen size={48} />
          <h3>Chưa có phiên học nào</h3>
          <p>Tạo phiên học đầu tiên để bắt đầu hành trình cùng AI Tutor.</p>
          <button className="btn btn-primary" onClick={() => setShowNewSession(true)}>
            <Plus size={16} /> Tạo phiên học
          </button>
        </div>
      ) : (
        sessions.map((session) => (
          <div
            key={session._id}
            className="session-card"
            onClick={() => openSession(session._id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openSession(session._id)}
          >
            <div className="session-card-left">
              <div className={`session-icon ${session.status}`}>
                {session.status === 'active' ? <MessageSquare size={20} /> :
                 session.status === 'completed' ? <CheckCircle size={20} /> :
                 <Archive size={20} />}
              </div>
              <div className="session-info">
                <h4>{session.title || session.subject}</h4>
                <div className="session-meta">
                  <span><BookOpen size={11} /> {session.subject}</span>
                  <span><Clock size={11} /> {formatDate(session.updatedAt)}</span>
                  <span><HelpCircle size={11} /> {session.questionsAsked || 0} câu hỏi</span>
                </div>
              </div>
            </div>
            <div className="session-card-right">
              {session.masteryLevel > 0 && (
                <span className={`mastery-badge ${getMasteryClass(session.masteryLevel)}`}>
                  <Target size={12} />
                  {session.masteryLevel}%
                </span>
              )}
              <span className={`badge ${session.status === 'active' ? 'badge-success' : ''}`}>
                {session.status === 'active' ? 'Đang học' : session.status === 'completed' ? 'Hoàn thành' : 'Lưu trữ'}
              </span>
              <button
                className="session-delete-btn"
                onClick={(e) => handleDeleteSession(session._id, e)}
                title="Xóa phiên"
              >
                <Trash2 size={14} />
              </button>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ─── Render: Stats Tab ─────────────────────────────────
  const renderStats = () => {
    if (statsLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span className="spinner spinner-lg" />
        </div>
      );
    }

    if (!stats) return null;

    return (
      <div className="animate-fade-in">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-item-icon sessions"><BookOpen size={20} /></div>
            <div className="stat-item-data">
              <span className="stat-item-value">{stats.stats.totalSessions}</span>
              <span className="stat-item-label">Tổng phiên học</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-item-icon active"><MessageSquare size={20} /></div>
            <div className="stat-item-data">
              <span className="stat-item-value">{stats.stats.activeSessions}</span>
              <span className="stat-item-label">Đang hoạt động</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-item-icon mastery"><Target size={20} /></div>
            <div className="stat-item-data">
              <span className="stat-item-value">{stats.stats.avgMastery}%</span>
              <span className="stat-item-label">Mastery trung bình</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-item-icon questions"><HelpCircle size={20} /></div>
            <div className="stat-item-data">
              <span className="stat-item-value">{stats.stats.totalQuestions}</span>
              <span className="stat-item-label">Câu hỏi đã hỏi</span>
            </div>
          </div>
        </div>

        {/* Top Subjects */}
        {stats.topSubjects?.length > 0 && (
          <div className="subjects-section">
            <h3><BarChart3 size={18} /> Môn học đã học</h3>
            <div className="subjects-grid">
              {stats.topSubjects.map((subj, i) => (
                <div key={i} className="subject-card">
                  <h4>{subj.subject}</h4>
                  <div className="subject-card-stats">
                    <span>{subj.sessionCount} phiên</span>
                    <span className={`mastery-badge ${getMasteryClass(subj.avgMastery)}`}>
                      {subj.avgMastery}%
                    </span>
                  </div>
                  <div className="mastery-bar">
                    <div
                      className="mastery-bar-fill"
                      style={{ width: `${subj.avgMastery}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {stats.recentSessions?.length > 0 && (
          <div className="subjects-section" style={{ marginTop: '2rem' }}>
            <h3><Clock size={18} /> Hoạt động gần đây</h3>
            {stats.recentSessions.map((s) => (
              <div
                key={s._id}
                className="session-card"
                onClick={() => openSession(s._id)}
                role="button"
                tabIndex={0}
              >
                <div className="session-card-left">
                  <div className={`session-icon ${s.status}`}>
                    {s.status === 'active' ? <MessageSquare size={20} /> : <CheckCircle size={20} />}
                  </div>
                  <div className="session-info">
                    <h4>{s.title || s.subject}</h4>
                    <div className="session-meta">
                      <span><Clock size={11} /> {formatDate(s.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="session-card-right">
                  {s.masteryLevel > 0 && (
                    <span className={`mastery-badge ${getMasteryClass(s.masteryLevel)}`}>
                      <Target size={12} /> {s.masteryLevel}%
                    </span>
                  )}
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="tutor-page">
      {/* Background */}
      <div className="tutor-bg" aria-hidden="true">
        <div className="tutor-bg-orb tutor-bg-orb-1" />
        <div className="tutor-bg-orb tutor-bg-orb-2" />
      </div>

      {/* Header */}
      <header className="tutor-header" role="banner">
        <div className="tutor-header-left">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/dashboard')} title="Quay lại Dashboard">
            <ArrowLeft size={18} />
          </button>
          <h1>
            <GraduationCap size={22} />
            AI Tutor
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowNewSession(true); setError(''); }}>
            <Plus size={14} /> Phiên mới
          </button>
        </div>
      </header>

      <main className="tutor-main">
        {/* Tabs */}
        <div className="tutor-tabs">
          <button
            className={`tutor-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} />
            Học tập
          </button>
          <button
            className={`tutor-tab ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <BookOpen size={16} />
            Phiên học ({sessions.length})
          </button>
          <button
            className={`tutor-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={16} />
            Thống kê
          </button>
        </div>

        {/* Error banner */}
        {error && !showNewSession && (
          <div className="auth-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={14} /> {error}
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              onClick={() => setError('')}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* New Session Form Modal */}
        {showNewSession && renderNewSessionForm()}

        {/* Tab Content */}
        {!showNewSession && (
          <>
            {activeTab === 'chat' && renderChat()}
            {activeTab === 'sessions' && renderSessions()}
            {activeTab === 'stats' && renderStats()}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Helper: Format markdown to basic HTML ── ────────────────
function formatMessage(text) {
  if (!text) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Unordered lists
  html = html.replace(/((?:- .+<br \/>)+)/g, (match) => {
    const items = match.split('<br />').filter(Boolean).map((item) => `<li>${item.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:\d+\. .+<br \/>)+)/g, (match) => {
    const items = match.split('<br />').filter(Boolean).map((item) => `<li>${item.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  return html;
}
