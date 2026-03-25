import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const registeredRef = useRef(false);

  // Fetch notifications & unread count
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await notificationAPI.getAll(1, 30);
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationAPI.getUnreadCount();
      setUnreadCount(data.data.unreadCount);
    } catch {
      // Ignore errors
    }
  }, [user]);

  // Register user for real-time notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      registeredRef.current = false;
      return;
    }

    // Connect & register
    socketService.connect();
    if (!registeredRef.current) {
      socketService.emit('register_user', { userId: user._id });
      registeredRef.current = true;
    }

    // Listen for new notifications
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    socketService.on('new_notification', handleNewNotification);

    // Initial fetch
    fetchNotifications();

    return () => {
      socketService.off('new_notification', handleNewNotification);
    };
  }, [user, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }, []);

  // Delete single notification
  const deleteNotification = useCallback(async (id) => {
    try {
      const n = notifications.find(n => n._id === id);
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (n && !n.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // Ignore
    }
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
