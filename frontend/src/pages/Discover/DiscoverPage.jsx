import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { roomAPI } from '../../services/api';
import {
  Search, Compass, Users, BookOpen, ArrowLeft,
  ChevronDown, SortAsc, ArrowRight, UserPlus,
  CheckCircle, Filter, X, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Discover.css';

// ─── Discover Page ─────────────────────────────────────
export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State: dữ liệu phòng
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0 });

  // State: bộ lọc
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // State: dropdown menus
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // State: loading khi join
  const [joiningId, setJoiningId] = useState(null);

  // State: load more
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch phòng công khai
  const fetchRooms = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await roomAPI.discover({
        search: searchQuery,
        subject: selectedSubject,
        sortBy,
        page: pageNum,
        limit: 12,
      });

      const result = data.data;

      if (append) {
        setRooms(prev => [...prev, ...result.rooms]);
      } else {
        setRooms(result.rooms);
      }

      setSubjects(result.subjects || []);
      setPagination(result.pagination);
    } catch {
      toast.error('Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedSubject, sortBy]);

  // Re-fetch khi filter thay đổi
  useEffect(() => {
    fetchRooms(1);
  }, [fetchRooms]);

  // Tham gia phòng công khai
  const handleJoinPublic = async (roomId) => {
    setJoiningId(roomId);
    try {
      await roomAPI.joinPublic(roomId);
      toast.success('Tham gia phòng thành công!');

      // Cập nhật lại state để đổi nút "Tham gia" → "Đã tham gia"
      setRooms(prev =>
        prev.map(room =>
          room._id === roomId ? { ...room, isMember: true } : room
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tham gia thất bại');
    } finally {
      setJoiningId(null);
    }
  };

  // Load thêm trang kế
  const handleLoadMore = () => {
    const nextPage = pagination.page + 1;
    fetchRooms(nextPage, true);
  };

  // Sắp xếp options
  const SORT_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'members', label: 'Nhiều thành viên' },
    { value: 'name', label: 'Tên A-Z' },
    { value: 'oldest', label: 'Cũ nhất' },
  ];

  // Kiểm tra có filter active không
  const hasActiveFilters = searchQuery || selectedSubject;

  return (
    <div className="discover-page">
      {/* ── Animated Background ──────────────────────── */}
      <div className="discover-bg" aria-hidden="true">
        <div className="discover-bg-orb discover-bg-orb-1" />
        <div className="discover-bg-orb discover-bg-orb-2" />
        <div className="discover-bg-orb discover-bg-orb-3" />
      </div>

      {/* ── Header ───────────────────────────────────── */}
      <header className="discover-header" role="banner">
        <div className="discover-header-left">
          <button
            className="discover-back-btn"
            onClick={() => navigate('/dashboard')}
            aria-label="Quay lại Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <div className="discover-logo">
            <Compass size={22} />
            <span>Khám phá</span>
          </div>
        </div>
      </header>

      <main className="discover-main">
        {/* ── Hero Section ─────────────────────────────── */}
        <section className="discover-hero" aria-label="Giới thiệu">
          <div className="discover-hero-icon">
            <Globe size={28} />
          </div>
          <h1>
            Khám phá <span className="gradient-text">Phòng Công Khai</span>
          </h1>
          <p>Tìm kiếm và tham gia các phòng học theo tên, môn học hoặc số thành viên</p>
        </section>

        {/* ── Search & Filters ─────────────────────────── */}
        <div className="discover-toolbar">
          {/* Thanh tìm kiếm */}
          <div className="discover-search">
            <Search size={17} className="search-icon" />
            <input
              id="discover-search-input"
              type="text"
              className="input"
              placeholder="Tìm theo tên phòng, môn học..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Tìm kiếm phòng công khai"
            />
          </div>

          {/* Lọc theo môn học */}
          <div
            className="discover-subject-filter"
            onBlur={() => setTimeout(() => setShowSubjectMenu(false), 150)}
          >
            <button
              id="discover-subject-btn"
              className={`discover-subject-trigger ${selectedSubject ? 'active' : ''}`}
              onClick={() => setShowSubjectMenu(!showSubjectMenu)}
              aria-haspopup="listbox"
              aria-expanded={showSubjectMenu}
            >
              <Filter size={15} />
              <span>{selectedSubject || 'Môn học'}</span>
              <ChevronDown size={14} className={`discover-sort-chevron ${showSubjectMenu ? 'open' : ''}`} />
            </button>
            {showSubjectMenu && (
              <ul className="discover-subject-menu" role="listbox">
                <li
                  role="option"
                  aria-selected={!selectedSubject}
                  className={`discover-subject-option ${!selectedSubject ? 'active' : ''}`}
                  onClick={() => { setSelectedSubject(''); setShowSubjectMenu(false); }}
                >
                  Tất cả môn học
                  {!selectedSubject && <span className="discover-subject-check">✓</span>}
                </li>
                {subjects.map(sub => (
                  <li
                    key={sub}
                    role="option"
                    aria-selected={selectedSubject === sub}
                    className={`discover-subject-option ${selectedSubject === sub ? 'active' : ''}`}
                    onClick={() => { setSelectedSubject(sub); setShowSubjectMenu(false); }}
                  >
                    {sub}
                    {selectedSubject === sub && <span className="discover-subject-check">✓</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sắp xếp */}
          <div
            className="discover-sort"
            onBlur={() => setTimeout(() => setShowSortMenu(false), 150)}
          >
            <button
              id="discover-sort-btn"
              className="discover-sort-trigger"
              onClick={() => setShowSortMenu(!showSortMenu)}
              aria-haspopup="listbox"
              aria-expanded={showSortMenu}
            >
              <SortAsc size={15} />
              <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
              <ChevronDown size={14} className={`discover-sort-chevron ${showSortMenu ? 'open' : ''}`} />
            </button>
            {showSortMenu && (
              <ul className="discover-sort-menu" role="listbox">
                {SORT_OPTIONS.map(opt => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={sortBy === opt.value}
                    className={`discover-sort-option ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  >
                    {opt.label}
                    {sortBy === opt.value && <span className="discover-subject-check">✓</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Results Info ─────────────────────────────── */}
        {!loading && (
          <div className="discover-results-info">
            <span className="discover-results-count">
              Tìm thấy <strong>{pagination.total}</strong> phòng công khai
            </span>
            {hasActiveFilters && (
              <div className="discover-active-filters">
                {searchQuery && (
                  <button
                    className="discover-filter-tag"
                    onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                    title="Xóa từ khóa"
                  >
                    "{searchQuery}" <X size={12} />
                  </button>
                )}
                {selectedSubject && (
                  <button
                    className="discover-filter-tag"
                    onClick={() => setSelectedSubject('')}
                    title="Xóa bộ lọc môn học"
                  >
                    {selectedSubject} <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Room Cards Grid ──────────────────────────── */}
        <section className="discover-grid" aria-label="Danh sách phòng công khai">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="discover-skeleton-card">
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
                  <div className="skeleton" style={{ height: 18, width: '65%' }} />
                  <div className="skeleton" style={{ height: 14, width: '85%' }} />
                  <div className="skeleton" style={{ height: 14, width: '50%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <div className="skeleton" style={{ height: 24, width: 80, borderRadius: 20 }} />
                    <div className="skeleton" style={{ height: 36, width: 100, borderRadius: 10 }} />
                  </div>
                </div>
              ))
            : rooms.map((room) => (
                <article
                  key={room._id}
                  className={`discover-room-card ${room.isMember ? 'is-member' : ''}`}
                >
                  {/* Card Header */}
                  <div className="discover-card-header">
                    <div className="discover-card-icon">
                      <BookOpen size={20} />
                    </div>
                    <div className="discover-card-badges">
                      <span className="discover-subject-badge">{room.subject}</span>
                      <span className="discover-member-badge">
                        <Users size={11} />
                        {room.memberCount}
                      </span>
                    </div>
                  </div>

                  {/* Card Title */}
                  <h3 className="discover-card-title">{room.name}</h3>

                  {/* Card Description */}
                  <p className="discover-card-desc">
                    {room.description || `Phòng học ${room.subject} — tham gia để cùng nhau học tập!`}
                  </p>

                  {/* Card Footer */}
                  <div className="discover-card-footer">
                    <div className="discover-card-owner">
                      <div className="discover-owner-avatar">
                        {room.owner?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span>{room.owner?.name || 'Ẩn danh'}</span>
                    </div>

                    {room.isMember ? (
                      <button
                        className="discover-join-btn enter"
                        onClick={() => navigate(`/room/${room._id}`)}
                        aria-label={`Vào phòng ${room.name}`}
                      >
                        Vào phòng
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        className="discover-join-btn join"
                        onClick={() => handleJoinPublic(room._id)}
                        disabled={joiningId === room._id}
                        aria-label={`Tham gia ${room.name}`}
                      >
                        {joiningId === room._id ? (
                          <span className="spinner" />
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Tham gia
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              ))
          }

          {/* Empty state */}
          {!loading && rooms.length === 0 && (
            <div className="discover-empty" style={{ gridColumn: '1 / -1' }}>
              <div className="discover-empty-icon">
                <Search size={32} />
              </div>
              <h3>Không tìm thấy phòng nào</h3>
              <p>
                {hasActiveFilters
                  ? 'Thử thay đổi từ khóa hoặc bộ lọc để tìm phòng phù hợp'
                  : 'Chưa có phòng công khai nào. Hãy tạo phòng và chia sẻ!'}
              </p>
            </div>
          )}
        </section>

        {/* ── Load More ────────────────────────────────── */}
        {!loading && pagination.page < pagination.totalPages && (
          <div className="discover-load-more">
            <button
              id="discover-load-more-btn"
              className="btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <span className="spinner" /> : 'Tải thêm...'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
