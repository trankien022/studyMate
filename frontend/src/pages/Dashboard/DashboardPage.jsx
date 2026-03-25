import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { roomAPI } from '../../services/api';
import {
  Plus, Users, BookOpen, LogOut, Hash,
  ArrowRight, Clock, Search, UserPlus, Trash2, Settings,
  Crown, Layers
} from 'lucide-react';
import './Dashboard.css';
import '../Profile/Profile.css';

export default function DashboardPage() {
  const { user, logout, isPremium } = useAuth();

  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', subject: '' });
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await roomAPI.getAll(pageNum, 12);
      const newRooms = data.data.rooms;
      
      if (pageNum === 1) {
        setRooms(newRooms);
      } else {
        setRooms((prev) => [...prev, ...newRooms]);
      }
      
      setHasMore(pageNum < data.data.pagination.totalPages);
    } catch {
      setError('Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRooms(nextPage);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!createForm.name || createForm.name.trim().length < 2) {
      setError('Tên phòng phải có ít nhất 2 ký tự');
      return;
    }
    if (!createForm.subject || createForm.subject.trim().length < 2) {
      setError('Môn học phải có ít nhất 2 ký tự');
      return;
    }

    setActionLoading(true);
    try {
      await roomAPI.create(createForm);
      setShowCreate(false);
      setCreateForm({ name: '', subject: '' });
      setPage(1);
      fetchRooms(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo phòng thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    if (!joinCode || joinCode.trim().length !== 8) {
      setError('Mã mời phải có đúng 8 ký tự');
      return;
    }

    setActionLoading(true);
    try {
      await roomAPI.join(joinCode);
      setShowJoin(false);
      setJoinCode('');
      setPage(1);
      fetchRooms(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Tham gia phòng thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRooms = useMemo(() =>
    rooms.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase())
    ),
    [rooms, search]
  );

  const totalMembers = useMemo(() =>
    rooms.reduce((sum, r) => sum + (r.members?.length || 0), 0),
    [rooms]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteRoom = async (roomId) => {
    setDeleting(true);
    try {
      await roomAPI.delete(roomId);
      setDeleteConfirm(null);
      setPage(1);
      fetchRooms(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Xóa phòng thất bại');
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="dashboard">
      {/* ── Animated Background ──────────────────────── */}
      <div className="dashboard-bg" aria-hidden="true">
        <div className="dashboard-bg-orb dashboard-bg-orb-1" />
        <div className="dashboard-bg-orb dashboard-bg-orb-2" />
        <div className="dashboard-bg-orb dashboard-bg-orb-3" />
        <div className="dashboard-bg-mesh" />
      </div>

      {/* ── Header ───────────────────────────────────── */}
      <header className="dashboard-header" role="banner">
        <div className="dashboard-header-left">
          <div className="dashboard-logo">
            <BookOpen size={22} />
            <span>AI StudyMate</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          <div className="dashboard-user">
            <div className="avatar-circle">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{user?.name}</span>
            {isPremium && (
              <span className="premium-badge" title="Tài khoản Premium">
                <Crown size={10} />
                PRO
              </span>
            )}
          </div>
          <button
            id="profile-btn"
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/profile')}
            title="Cài đặt tài khoản"
            aria-label="Cài đặt tài khoản"
          >
            <Settings size={17} />
          </button>
          <button
            id="upgrade-btn"
            className="btn-upgrade"
            onClick={() => navigate('/pricing')}
            title={isPremium ? 'Xem gói Premium' : 'Nâng cấp Premium'}
          >
            <Crown size={15} />
            <span className="upgrade-text">{isPremium ? 'Xem gói' : 'Nâng cấp'}</span>
          </button>
          <button
            id="logout-btn"
            className="btn btn-ghost btn-icon"
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* ── Welcome Section ─────────────────────────── */}
        <section className="dashboard-welcome animate-fade-in" aria-label="Welcome">
          <div className="welcome-text">
            <h1>
              {getGreeting()}, <span className="gradient-text">{user?.name}</span>
            </h1>
            <p>Hôm nay bạn muốn học gì?</p>
          </div>
          <div className="welcome-actions">
            <button
              id="create-room-btn"
              className="btn btn-primary"
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
            >
              <Plus size={17} />
              Tạo phòng
            </button>
            <button
              id="join-room-btn"
              className="btn btn-secondary"
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
            >
              <UserPlus size={17} />
              Tham gia
            </button>
          </div>
        </section>

        {/* ── Quick Stats ─────────────────────────────── */}
        {!loading && rooms.length > 0 && (
          <div className="dashboard-stats animate-fade-in">
            <div className="stat-card">
              <div className="stat-icon stat-icon-rooms">
                <Layers size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{rooms.length}</span>
                <span className="stat-label">Phòng học</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-members">
                <Users size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{totalMembers}</span>
                <span className="stat-label">Tổng thành viên</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-premium">
                <Crown size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{isPremium ? 'Active' : 'Free'}</span>
                <span className="stat-label">Gói hiện tại</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Create / Join Form ──────────────────────── */}
        {(showCreate || showJoin) && (
          <div className="dashboard-modal-card animate-fade-in-up">
            {showCreate && (
              <form onSubmit={handleCreate} id="create-room-form">
                <h3>Tạo phòng học mới</h3>
                {error && <div className="auth-error">{error}</div>}
                <div className="form-group">
                  <label htmlFor="room-name">Tên phòng</label>
                  <input
                    id="room-name"
                    type="text"
                    className="input"
                    placeholder="VD: Nhóm ôn thi Toán rời rạc"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="room-subject">Môn học</label>
                  <input
                    id="room-subject"
                    type="text"
                    className="input"
                    placeholder="VD: Toán rời rạc"
                    value={createForm.subject}
                    onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? <span className="spinner" /> : 'Tạo phòng'}
                  </button>
                </div>
              </form>
            )}
            {showJoin && (
              <form onSubmit={handleJoin} id="join-room-form">
                <h3>Tham gia bằng mã mời</h3>
                {error && <div className="auth-error">{error}</div>}
                <div className="form-group">
                  <label htmlFor="invite-code">Mã mời</label>
                  <input
                    id="invite-code"
                    type="text"
                    className="input"
                    placeholder="VD: A1B2C3D4"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowJoin(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? <span className="spinner" /> : 'Tham gia'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Search + Room Label ──────────────────────── */}
        {rooms.length > 0 && (
          <>
            <div className="section-label">
              <h2>Phòng học của bạn</h2>
              <span className="room-count">{rooms.length} phòng</span>
            </div>
            <div className="dashboard-search animate-fade-in">
              <Search size={17} className="search-icon" />
              <input
                id="search-rooms"
                type="text"
                className="input"
                placeholder="Tìm kiếm phòng học..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm kiếm phòng học"
              />
            </div>
          </>
        )}

        {/* ── Room Cards ──────────────────────────────── */}
        <section className="rooms-grid stagger-children" aria-label="Room list">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="room-card-skeleton">
                  <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 20 }} />
                  <div className="skeleton" style={{ height: 14, width: '80%' }} />
                </div>
              ))
            : filteredRooms.map((room) => (
                <article
                  key={room._id}
                  className="room-card"
                  onClick={() => navigate(`/room/${room._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/room/${room._id}`)}
                >
                  <div className="room-card-header">
                    <div className="room-card-icon">
                      <BookOpen size={19} />
                    </div>
                    <div className="room-card-actions">
                      <span className="badge">{room.subject}</span>
                      {room.owner?._id === user?._id && (
                        <button
                          className="btn-icon-sm"
                          title="Xóa phòng"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(room); }}
                          aria-label={`Xóa phòng ${room.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="room-card-title">{room.name}</h3>
                  <div className="room-card-meta">
                    <span className="meta-item">
                      <Users size={13} />
                      {room.members?.length || 0} thành viên
                    </span>
                    <span className="meta-item">
                      <Hash size={13} />
                      {room.inviteCode}
                    </span>
                  </div>
                  <div className="room-card-footer">
                    <span className="meta-item">
                      <Clock size={13} />
                      {new Date(room.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                    <ArrowRight size={15} className="room-card-arrow" />
                  </div>
                </article>
              ))
          }

          {!loading && filteredRooms.length === 0 && rooms.length > 0 && (
            <div className="empty-state animate-fade-in">
              <Search size={44} />
              <h3>Không tìm thấy phòng nào</h3>
              <p>Thử từ khóa khác hoặc tạo phòng mới</p>
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="empty-state animate-fade-in">
              <BookOpen size={44} />
              <h3>Chưa có phòng học nào</h3>
              <p>Tạo phòng mới hoặc tham gia bằng mã mời để bắt đầu!</p>
            </div>
          )}
        </section>

        {hasMore && filteredRooms.length > 0 && search === '' && (
          <div className="load-more-container">
            <button
              className="btn btn-secondary"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <span className="spinner" /> : 'Tải thêm...'}
            </button>
          </div>
        )}
      </main>

      {/* ── Delete Confirmation Dialog ────────────────── */}
      {deleteConfirm && (
        <div
          className="confirm-overlay"
          onClick={() => !deleting && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Xóa phòng ${deleteConfirm.name}`}
        >
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xóa phòng &quot;{deleteConfirm.name}&quot;?</h3>
            <p>
              Toàn bộ dữ liệu của phòng (chat AI, ghi chú, quiz, kết quả) sẽ bị xóa vĩnh viễn.
              Hành động này không thể hoàn tác.
            </p>
            <div className="confirm-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Hủy
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDeleteRoom(deleteConfirm._id)}
                disabled={deleting}
                id="confirm-delete-room"
              >
                {deleting ? <span className="spinner" /> : (
                  <>
                    <Trash2 size={15} />
                    Xóa phòng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
