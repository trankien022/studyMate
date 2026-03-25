import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Bell, Check, CheckCheck, Trash2, X,
  Users, BookOpen, Crown, AlertTriangle,
  BrainCircuit, UserMinus, UserPlus, Sparkles,
} from 'lucide-react';
import './NotificationBell.css';

const TYPE_CONFIG = {
  quiz_created: { icon: BrainCircuit, color: 'purple', label: 'Quiz' },
  member_joined: { icon: UserPlus, color: 'green', label: 'Tham gia' },
  member_left: { icon: UserMinus, color: 'orange', label: 'Rời phòng' },
  member_kicked: { icon: AlertTriangle, color: 'red', label: 'Đuổi' },
  room_deleted: { icon: Trash2, color: 'red', label: 'Xóa phòng' },
  ownership_transfer: { icon: Crown, color: 'gold', label: 'Chủ phòng' },
  quiz_result: { icon: BookOpen, color: 'blue', label: 'Kết quả' },
  system: { icon: Sparkles, color: 'blue', label: 'Hệ thống' },
};

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function NotificationBell() {
  const {
    notifications, unreadCount, loading,
    markAsRead, markAllAsRead, deleteNotification, clearAll,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        open &&
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (n) => {
    if (!n.isRead) markAsRead(n._id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="notif-bell-wrapper">
      <button
        ref={btnRef}
        className={`btn btn-ghost btn-icon notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(!open)}
        title="Thông báo"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        id="notification-bell"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-live="polite">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" ref={panelRef} role="dialog" aria-label="Thông báo">
          {/* Header */}
          <div className="notif-panel-header">
            <h3>
              <Bell size={16} />
              Thông báo
              {unreadCount > 0 && <span className="notif-header-count">{unreadCount}</span>}
            </h3>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button
                  className="notif-action-btn"
                  onClick={markAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="notif-action-btn notif-action-danger"
                  onClick={clearAll}
                  title="Xóa tất cả"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                className="notif-action-btn"
                onClick={() => setOpen(false)}
                title="Đóng"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="notif-panel-body">
            {loading && notifications.length === 0 && (
              <div className="notif-loading">
                <span className="spinner" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="notif-empty">
                <Bell size={32} />
                <p>Chưa có thông báo nào</p>
              </div>
            )}

            {notifications.map((n) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
              const IconComp = config.icon;
              return (
                <div
                  key={n._id}
                  className={`notif-item ${!n.isRead ? 'notif-unread' : ''}`}
                  onClick={() => handleClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
                >
                  <div className={`notif-item-icon notif-icon-${config.color}`}>
                    <IconComp size={16} />
                  </div>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{n.title}</p>
                    <p className="notif-item-message">{n.message}</p>
                    <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  <div className="notif-item-actions" onClick={(e) => e.stopPropagation()}>
                    {!n.isRead && (
                      <button
                        className="notif-item-btn"
                        onClick={() => markAsRead(n._id)}
                        title="Đánh dấu đã đọc"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      className="notif-item-btn notif-item-btn-danger"
                      onClick={() => deleteNotification(n._id)}
                      title="Xóa"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
