import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Users, Hash, Copy, Check,
  MessageSquare, MessageCircle, FileText, Brain, LogOut, Trash2,
  Sun, Moon, Timer, BarChart3
} from 'lucide-react';
import ChatTab from './tabs/ChatTab';
import GroupChatTab from './tabs/GroupChatTab';
import NotesTab from './tabs/NotesTab';
import QuizTab from './tabs/QuizTab';
import PomodoroTimer from './tabs/PomodoroTimer';
import AnalyticsTab from './tabs/AnalyticsTab';
import './Room.css';
import '../Profile/Profile.css';

const TABS = [
  { id: 'group_chat', label: 'Nhóm', icon: MessageCircle },
  { id: 'chat', label: 'Chat AI', icon: MessageSquare },
  { id: 'notes', label: 'Ghi chú', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: Brain },
  { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { id: 'analytics', label: 'Thống kê', icon: BarChart3 },
];

export default function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('group_chat');
  const [copied, setCopied] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  // Member management state
  const [managingMember, setManagingMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const { data } = await roomAPI.getById(id);
      setRoom(data.data.room);
    } catch {
      toast.error('Không thể tải thông tin phòng');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchRoom();
    
    // Connect socket & join room
    socketService.connect();
    if (user) {
      socketService.joinRoom(id, user);
    }

    // Lắng nghe thay đổi thành viên trong phòng
    const handleMemberJoined = ({ user: joinedUser }) => {
      if (joinedUser?._id !== user?._id) {
        toast.success(`${joinedUser?.name || 'Ai đó'} vừa tham gia phòng`);
      }
      fetchRoom(); // Tải lại chi tiết phòng khi có người ra/vào
    };

    const handleMemberLeft = ({ user: leftUser }) => {
      if (leftUser?._id !== user?._id) {
        toast(`${leftUser?.name || 'Ai đó'} đã rời phòng`, { icon: '👋' });
      }
      fetchRoom();
    };

    const handleQuizCreated = ({ topic, user: creatorName }) => {
      toast.success(`${creatorName} vừa tạo Quiz mới: ${topic}`);
    };

    socketService.on('member_joined', handleMemberJoined);
    socketService.on('member_left', handleMemberLeft);
    socketService.on('quiz_created', handleQuizCreated);

    return () => {
      socketService.leaveRoom(id, user);
      socketService.off('member_joined', handleMemberJoined);
      socketService.off('member_left', handleMemberLeft);
      socketService.off('quiz_created', handleQuizCreated);
      socketService.disconnect();
    };
  }, [id, user, fetchRoom]);

  const copyInviteCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép mã mời');
    }
  };

  if (loading) {
    return (
      <div className="room-loading">
        <div className="spinner spinner-lg" />
        <p>Đang tải phòng học...</p>
      </div>
    );
  }

  if (!room) return null;

  const isOwner = room.owner?._id === user?._id;

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await roomAPI.leave(id);
      toast.success('Đã rời phòng thành công');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi khi rời phòng');
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleKickMember = async (memberId) => {
    if (!window.confirm('Bạn có chắc chắn muốn đuổi thành viên này ra khỏi phòng?')) return;
    setActionLoading(true);
    try {
      await roomAPI.kickMember(id, memberId);
      toast.success('Đã xóa thành viên khỏi phòng');
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi đuổi thành viên');
    } finally {
      setActionLoading(false);
      setManagingMember(null);
    }
  };

  const handleTransferOwnership = async (memberId) => {
    if (!window.confirm('Chuyển quyền chủ phòng cho người này? Bạn sẽ trở thành thành viên thường.')) return;
    setActionLoading(true);
    try {
      await roomAPI.transferOwnership(id, memberId);
      toast.success('Chuyển quyền chủ phòng thành công');
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi chuyển quyền');
    } finally {
      setActionLoading(false);
      setManagingMember(null);
    }
  };

  return (
    <div className="room-layout">
      {/* Sidebar Layout */}
      <aside className="room-sidebar glass">
        <div className="sidebar-header">
          <button
            className="btn btn-ghost btn-icon-round back-btn"
            onClick={() => navigate('/dashboard')}
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="room-title-info">
            <h1 className="room-name">{room.name}</h1>
            <span className="badge badge-primary-subtle">{room.subject}</span>
          </div>
        </div>

        <nav className="sidebar-nav" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="tab-icon-wrapper">
                  <Icon size={18} />
                </div>
                <span>{tab.label}</span>
                {activeTab === tab.id && <div className="tab-active-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="room-stats">
            <button
              className="stat-btn copy-btn"
              onClick={copyInviteCode}
              title="Sao chép mã mời"
            >
              <div className="stat-icon"><Hash size={14} /></div>
              <span className="stat-text">{room.inviteCode}</span>
              {copied ? <Check size={14} className="copied-icon text-success" /> : <Copy size={14} className="copy-icon" />}
            </button>
            
            <button
              className={`stat-btn members-btn ${showMembers ? 'active' : ''}`}
              onClick={() => setShowMembers(!showMembers)}
            >
              <div className="stat-icon"><Users size={14} /></div>
              <span className="stat-text">{room.members?.length || 0} thành viên</span>
            </button>
          </div>

          {!isOwner && (
            <button
              className="btn btn-danger-subtle leave-btn"
              onClick={() => setShowLeaveConfirm(true)}
            >
              <LogOut size={16} />
              <span>Rời phòng</span>
            </button>
          )}

          <button
            id="room-theme-toggle"
            className="btn btn-ghost theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Sáng' : 'Tối'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="room-main">
        {/* Animated Members Panel overlay */}
        {showMembers && (
          <div className="members-overlay-panel glass animate-slide-in-left">
            <div className="members-header">
              <h3>Thành viên phòng ({room.members?.length})</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMembers(false)}>
                <ArrowLeft size={16} />
              </button>
            </div>
            <ul className="members-list-styled">
              {room.members?.map((member) => (
                <li key={member._id} className="member-card">
                  <div className="avatar-gradient avatar-md">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-details" style={{ flex: 1, overflow: 'hidden' }}>
                    <span className="member-name text-truncate">
                      {member.name}
                      {member._id === room.owner?._id && (
                        <span className="badge badge-warning-subtle ml-2">Owner</span>
                      )}
                      {member._id === user._id && (
                        <span className="badge badge-primary-subtle ml-2">Bạn</span>
                      )}
                    </span>
                    <span className="member-email text-truncate">{member.email}</span>
                  </div>
                  
                  {isOwner && member._id !== user._id && (
                    <div className="member-actions dropdown" style={{ position: 'relative' }}>
                      <button 
                        className="btn btn-ghost btn-icon-sm"
                        onClick={() => setManagingMember(managingMember === member._id ? null : member._id)}
                      >
                        ⋮
                      </button>
                      
                      {managingMember === member._id && (
                        <div className="dropdown-menu show" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: '150px' }}>
                          <button 
                            className="dropdown-item"
                            onClick={() => handleTransferOwnership(member._id)}
                            disabled={actionLoading}
                          >
                            Chuyển Owner
                          </button>
                          <div className="dropdown-divider"></div>
                          <button 
                            className="dropdown-item text-danger"
                            onClick={() => handleKickMember(member._id)}
                            disabled={actionLoading}
                          >
                            Mời ra khỏi phòng
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tab-render-area">
          {activeTab === 'group_chat' && <GroupChatTab roomId={id} />}
          {activeTab === 'chat' && <ChatTab roomId={id} />}
          {activeTab === 'notes' && <NotesTab roomId={id} room={room} onUpdate={fetchRoom} />}
          {activeTab === 'quiz' && <QuizTab roomId={id} />}
          {activeTab === 'pomodoro' && <PomodoroTimer />}
          {activeTab === 'analytics' && <AnalyticsTab roomId={id} />}
        </div>
      </main>

      {/* Leave confirmation dialog */}
      {showLeaveConfirm && (
        <div className="modal-backdrop animate-fade-in" onClick={() => !leaving && setShowLeaveConfirm(false)}>
          <div className="modal-content animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <LogOut size={24} />
            </div>
            <h3 className="modal-title">Rời phòng "{room.name}"?</h3>
            <p className="modal-desc">
              Bạn sẽ không thể truy cập phòng này nữa trừ khi được mời lại.
            </p>
            <div className="modal-actions-flex">
              <button className="btn btn-secondary" onClick={() => setShowLeaveConfirm(false)} disabled={leaving}>
                Hủy thay đổi
              </button>
              <button className="btn btn-danger" onClick={handleLeave} disabled={leaving}>
                {leaving ? <span className="spinner" /> : 'Xác nhận rời'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
