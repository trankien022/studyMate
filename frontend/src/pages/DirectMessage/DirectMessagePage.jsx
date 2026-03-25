import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dmAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Send, Search, MessageSquare, Users,
  Check, CheckCheck, Circle, Plus, X,
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import './DirectMessage.css';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DirectMessagePage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await dmAPI.getConversations();
      setConversations(data.data.conversations);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await dmAPI.getContacts();
      setContacts(data.data.contacts);
    } catch {
      // Ignore
    }
  }, []);

  // Fetch messages for a partner
  const fetchMessages = useCallback(async (pid) => {
    setMessagesLoading(true);
    try {
      const { data } = await dmAPI.getMessages(pid);
      setMessages(data.data.messages);
      scrollToBottom();

      // Mark as read
      dmAPI.markRead(pid).catch(() => {});
    } catch {
      toast.error('Không thể tải tin nhắn');
    } finally {
      setMessagesLoading(false);
    }
  }, [scrollToBottom]);

  // Select partner
  const selectPartner = useCallback((partner) => {
    setSelectedPartner(partner);
    setShowNewChat(false);
    navigate(`/dm/${partner._id}`, { replace: true });
    fetchMessages(partner._id);
  }, [navigate, fetchMessages]);

  // Initialize
  useEffect(() => {
    socketService.connect();
    if (user) {
      socketService.emit('register_user', { userId: user._id });
    }
    fetchConversations();
    fetchContacts();
  }, [user, fetchConversations, fetchContacts]);

  // Handle URL partner param
  useEffect(() => {
    if (partnerId && contacts.length > 0 && !selectedPartner) {
      // Find in conversations first
      const conv = conversations.find(c => c.partner?._id === partnerId);
      if (conv?.partner) {
        setSelectedPartner(conv.partner);
        fetchMessages(partnerId);
      } else {
        // Find in contacts
        const contact = contacts.find(c => c._id === partnerId);
        if (contact) {
          setSelectedPartner(contact);
          fetchMessages(partnerId);
        }
      }
    }
  }, [partnerId, contacts, conversations, selectedPartner, fetchMessages]);

  // Real-time message listener
  useEffect(() => {
    const handleNewMessage = (msg) => {
      const isCurrentConv =
        selectedPartner &&
        (msg.sender._id === selectedPartner._id || msg.receiver._id === selectedPartner._id);

      if (isCurrentConv) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();

        // Auto-mark read if received
        if (msg.sender._id === selectedPartner._id) {
          dmAPI.markRead(selectedPartner._id).catch(() => {});
        }
      }

      // Update conversations list
      fetchConversations();
    };

    const handleTyping = ({ userId, isTyping }) => {
      if (selectedPartner && userId === selectedPartner._id) {
        setPartnerTyping(isTyping);
      }
    };

    const handleMessagesRead = ({ readBy }) => {
      if (selectedPartner && readBy === selectedPartner._id) {
        setMessages(prev =>
          prev.map(m =>
            m.sender._id === user._id && !m.isRead
              ? { ...m, isRead: true }
              : m
          )
        );
      }
    };

    socketService.on('dm_new_message', handleNewMessage);
    socketService.on('dm_partner_typing', handleTyping);
    socketService.on('dm_messages_read', handleMessagesRead);

    return () => {
      socketService.off('dm_new_message', handleNewMessage);
      socketService.off('dm_partner_typing', handleTyping);
      socketService.off('dm_messages_read', handleMessagesRead);
    };
  }, [selectedPartner, user, scrollToBottom, fetchConversations]);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedPartner || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    // Stop typing indicator
    socketService.emit('dm_typing', {
      partnerId: selectedPartner._id,
      isTyping: false,
      userId: user._id,
    });

    try {
      await dmAPI.sendMessage(selectedPartner._id, content);
    } catch {
      toast.error('Gửi tin nhắn thất bại');
      setInput(content); // Restore input
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (selectedPartner) {
      socketService.emit('dm_typing', {
        partnerId: selectedPartner._id,
        isTyping: true,
        userId: user._id,
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.emit('dm_typing', {
          partnerId: selectedPartner._id,
          isTyping: false,
          userId: user._id,
        });
      }, 2000);
    }
  };

  // Filter conversations + contacts
  const filteredConversations = conversations.filter(c =>
    c.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !conversations.some(conv => conv.partner?._id === c._id)
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="dm-layout">
      {/* ── Sidebar ──────────────────────────────── */}
      <aside className="dm-sidebar">
        <div className="dm-sidebar-header">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/dashboard')}
            title="Quay lại Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <h2>Tin nhắn</h2>
          <div className="dm-sidebar-actions">
            <NotificationBell />
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setShowNewChat(!showNewChat)}
              title="Cuộc trò chuyện mới"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="dm-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="dm-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="dm-conv-list">
          {/* New contacts section */}
          {showNewChat && filteredContacts.length > 0 && (
            <div className="dm-section">
              <span className="dm-section-label">Bắt đầu trò chuyện</span>
              {filteredContacts.map(contact => (
                <button
                  key={contact._id}
                  className="dm-conv-item"
                  onClick={() => selectPartner(contact)}
                >
                  <div className="dm-avatar">
                    {contact.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="dm-conv-info">
                    <span className="dm-conv-name">{contact.name}</span>
                    <span className="dm-conv-preview">{contact.email}</span>
                  </div>
                  <Circle size={8} className="dm-online-dot" />
                </button>
              ))}
            </div>
          )}

          {/* Existing conversations */}
          {loading ? (
            <div className="dm-loading">
              <div className="spinner" />
            </div>
          ) : filteredConversations.length === 0 && !showNewChat ? (
            <div className="dm-empty-sidebar">
              <MessageSquare size={32} />
              <p>Chưa có cuộc hội thoại</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setShowNewChat(true); fetchContacts(); }}
              >
                <Plus size={14} /> Bắt đầu nhắn tin
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.conversationId}
                className={`dm-conv-item ${
                  selectedPartner?._id === conv.partner?._id ? 'active' : ''
                } ${conv.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => selectPartner(conv.partner)}
              >
                <div className="dm-avatar">
                  {conv.partner?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="dm-conv-info">
                  <div className="dm-conv-top">
                    <span className="dm-conv-name">{conv.partner?.name}</span>
                    <span className="dm-conv-time">
                      {timeAgo(conv.lastMessage?.createdAt)}
                    </span>
                  </div>
                  <div className="dm-conv-bottom">
                    <span className="dm-conv-preview">
                      {conv.lastMessage?.sender?.toString() === user?._id
                        ? 'Bạn: '
                        : ''}
                      {conv.lastMessage?.content}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="dm-unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat Area ────────────────────────────── */}
      <main className="dm-main">
        {!selectedPartner ? (
          <div className="dm-empty-chat">
            <div className="dm-empty-icon">
              <MessageSquare size={48} />
            </div>
            <h3>Chọn cuộc hội thoại</h3>
            <p>Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="dm-chat-header">
              <button
                className="dm-back-mobile btn btn-ghost btn-icon"
                onClick={() => { setSelectedPartner(null); navigate('/dm', { replace: true }); }}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="dm-partner-info">
                <div className="dm-avatar dm-avatar-header">
                  {selectedPartner.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{selectedPartner.name}</h3>
                  {partnerTyping ? (
                    <span className="dm-typing-text">Đang nhập...</span>
                  ) : (
                    <span className="dm-partner-email">{selectedPartner.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="dm-messages">
              {messagesLoading ? (
                <div className="dm-messages-loading">
                  <div className="spinner" />
                  <p>Đang tải tin nhắn...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="dm-messages-empty">
                  <Users size={36} />
                  <p>Bắt đầu cuộc trò chuyện với <strong>{selectedPartner.name}</strong></p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date} className="dm-date-group">
                    <div className="dm-date-divider">
                      <span>{date}</span>
                    </div>
                    {msgs.map((msg) => {
                      const isMine = msg.sender?._id === user?._id ||
                        msg.sender?.toString() === user?._id;
                      return (
                        <div
                          key={msg._id}
                          className={`dm-message ${isMine ? 'dm-message-mine' : 'dm-message-theirs'}`}
                        >
                          {!isMine && (
                            <div className="dm-msg-avatar">
                              {selectedPartner.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="dm-msg-bubble">
                            <p>{msg.content}</p>
                            <div className="dm-msg-meta">
                              <span className="dm-msg-time">{formatTime(msg.createdAt)}</span>
                              {isMine && (
                                <span className="dm-msg-status">
                                  {msg.isRead ? (
                                    <CheckCheck size={14} className="dm-read-icon" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Typing indicator */}
              {partnerTyping && (
                <div className="dm-message dm-message-theirs">
                  <div className="dm-msg-avatar">
                    {selectedPartner.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="dm-msg-bubble dm-typing-bubble">
                    <div className="dm-typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="dm-input-area" onSubmit={handleSend}>
              <div className="dm-input-wrapper">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder={`Nhắn tin cho ${selectedPartner.name}...`}
                  rows={1}
                  maxLength={2000}
                  disabled={sending}
                />
              </div>
              <button
                type="submit"
                className="dm-send-btn btn btn-primary"
                disabled={!input.trim() || sending}
                title="Gửi tin nhắn"
              >
                {sending ? <span className="spinner" /> : <Send size={18} />}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
