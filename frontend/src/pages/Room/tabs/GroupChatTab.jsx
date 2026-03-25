import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { socketService } from '../../../services/socket';
import { Send, Users, User } from 'lucide-react';

export default function GroupChatTab({ roomId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Lắng nghe tin nhắn mới từ những người khác
    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socketService.on('receive_message', handleReceiveMessage);

    // Dọn dẹp listener khi component unmount
    return () => {
      socketService.off('receive_message', handleReceiveMessage);
    };
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput('');

    const newMsg = {
      id: Date.now().toString(),
      text,
      user: {
        _id: user._id,
        name: user.name,
      },
      createdAt: new Date().toISOString(),
    };

    // Cập nhật giao diện của mình
    setMessages((prev) => [...prev, newMsg]);

    // Gửi qua socket
    socketService.emit('chat_message', { roomId, message: newMsg });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-tab animate-fade-in">
      <div className="chat-layout" style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        
        {/* Main group chat area */}
        <div className="chat-main">
          <div className="chat-header" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Users size={20} color="var(--color-primary-500)" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Thảo luận nhóm</h3>
          </div>

          {messages.length === 0 ? (
            <div className="chat-empty">
              <Users size={48} />
              <h3>Chưa có tin nhắn nào</h3>
              <p>Hãy gửi lời chào đến các thành viên khác trong phòng để bắt đầu thảo luận!</p>
            </div>
          ) : (
            <div className="chat-messages" style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
              {messages.map((msg) => {
                const isMine = msg.user._id === user._id;
                return (
                  <div
                    key={msg.id}
                    className={`message message-${isMine ? 'user' : 'ai'}`}
                    style={{ marginBottom: 'var(--space-3)', maxWidth: '80%' }}
                  >
                    {!isMine && (
                      <div className="message-avatar" style={{ alignSelf: 'flex-start', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        <User size={16} />
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      {!isMine && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px', marginLeft: '4px' }}>
                          {msg.user.name}
                        </span>
                      )}
                      <div className="message-bubble" style={{ 
                        background: isMine ? 'var(--color-primary-600)' : 'var(--color-bg-elevated)',
                        color: isMine ? '#fff' : 'var(--color-text-primary)'
                      }}>
                        {msg.text}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Group Chat Input */}
          <div className="chat-input-area">
            <form className="chat-input-form" onSubmit={handleSend}>
              <div className="chat-input-wrapper">
                <textarea
                  ref={textareaRef}
                  placeholder="Nhập tin nhắn..."
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary chat-send-btn"
                disabled={!input.trim()}
                title="Gửi"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
