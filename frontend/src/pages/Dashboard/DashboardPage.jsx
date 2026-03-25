import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { roomAPI } from '../../services/api';
import {
  Plus, Users, BookOpen, LogOut, Hash,
  ArrowRight, Clock, Search, UserPlus, Trash2, Settings,
  Sun, Moon
} from 'lucide-react';
import './Dashboard.css';
import '../Profile/Profile.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

    // Frontend validation
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

    // Frontend validation
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

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header glass">
        <div className="dashboard-header-left">
          <div className="dashboard-logo">
            <BookOpen size={24} />
            <span>AI StudyMate</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          <div className="dashboard-user">
            <div className="avatar-circle">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{user?.name}</span>
          </div>
          <button
            id="theme-toggle-btn"
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            id="profile-btn"
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/profile')}
            title="Cài đặt tài khoản"
          >
            <Settings size={18} />
          </button>
          <button
            id="logout-btn"
            className="btn btn-ghost btn-icon"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Welcome section */}
        <section className="dashboard-welcome animate-fade-in">
          <div className="welcome-text">
            <h1>
              Xin chào, <span className="gradient-text">{user?.name}</span> 👋
            </h1>
            <p>Hôm nay bạn muốn học gì?</p>
          </div>
          <div className="welcome-actions">
            <button
              id="create-room-btn"
              className="btn btn-primary"
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
            >
              <Plus size={18} />
              Tạo phòng mới
            </button>
            <button
              id="join-room-btn"
              className="btn btn-secondary"
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
            >
              <UserPlus size={18} />
              Tham gia phòng
            </button>
          </div>
        </section>

        {/* Create / Join modal-like inline form */}
        {(showCreate || showJoin) && (
          <div className="dashboard-modal-card card animate-fade-in-up">
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

        {/* Search bar */}
        {rooms.length > 0 && (
          <div className="dashboard-search animate-fade-in">
            <Search size={18} className="search-icon" />
            <input
              id="search-rooms"
              type="text"
              className="input"
              placeholder="Tìm kiếm phòng học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        )}

        {/* Room cards */}
        <section className="rooms-grid stagger-children">
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
                  className="room-card card"
                  onClick={() => navigate(`/room/${room._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/room/${room._id}`)}
                >
                  <div className="room-card-header">
                    <div className="room-card-icon">
                      <BookOpen size={20} />
                    </div>
                    <div className="room-card-actions">
                      <span className="badge">{room.subject}</span>
                      {room.owner?._id === user?._id && (
                        <button
                          className="btn-icon-sm"
                          title="Xóa phòng"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(room); }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="room-card-title">{room.name}</h3>
                  <div className="room-card-meta">
                    <span className="meta-item">
                      <Users size={14} />
                      {room.members?.length || 0} thành viên
                    </span>
                    <span className="meta-item">
                      <Hash size={14} />
                      {room.inviteCode}
                    </span>
                  </div>
                  <div className="room-card-footer">
                    <span className="meta-item">
                      <Clock size={14} />
                      {new Date(room.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                    <ArrowRight size={16} className="room-card-arrow" />
                  </div>
                </article>
              ))
          }

          {!loading && filteredRooms.length === 0 && rooms.length > 0 && (
            <div className="empty-state animate-fade-in">
              <Search size={48} />
              <h3>Không tìm thấy phòng nào</h3>
              <p>Thử từ khóa khác hoặc tạo phòng mới</p>
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="empty-state animate-fade-in">
              <BookOpen size={48} />
              <h3>Chưa có phòng học nào</h3>
              <p>Tạo phòng mới hoặc tham gia bằng mã mời để bắt đầu!</p>
            </div>
          )}
        </section>

        {hasMore && filteredRooms.length > 0 && search === '' && (
          <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
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

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="confirm-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xóa phòng "{deleteConfirm.name}"?</h3>
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
                    <Trash2 size={16} />
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
