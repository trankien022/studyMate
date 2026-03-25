import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { aiAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, MessageSquare, Bot, Sparkles, Trash2, ChevronDown } from 'lucide-react';

export default function ChatTab({ roomId }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const fetchHistory = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoadingHistory(true);
    else setLoadingMore(true);

    try {
      const { data } = await aiAPI.getHistory(roomId, pageNum, 10);
      const newConvs = data.data.conversations;
      
      if (pageNum === 1) setConversations(newConvs);
      else setConversations((prev) => [...prev, ...newConvs]);
      
      setHasMore(pageNum < data.data.pagination.totalPages);
    } catch {
      toast.error('Không thể tải lịch sử trò chuyện');
    } finally {
      setLoadingHistory(false);
      setLoadingMore(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage);
  };

  const loadConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const { data } = await aiAPI.getConversation(convId);
      setMessages(data.data.conversation.messages);
    } catch {
      toast.error('Không thể tải cuộc trò chuyện');
    }
  };

  const startNew = () => {
    setActiveConvId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;

    setInput('');
    setSending(true);

    // Optimistic add user message
    const userMsg = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data } = await aiAPI.chat({
        roomId,
        message: msg,
        conversationId: activeConvId || undefined,
      });

      // Set conversation ID if new
      if (!activeConvId) {
        setActiveConvId(data.data.conversationId);
      }

      // Add AI response
      setMessages((prev) => [...prev, data.data.message]);

      // Refresh sidebar (back to page 1)
      setPage(1);
      fetchHistory(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi chat');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Có lỗi xảy ra, vui lòng thử lại.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleDeleteConv = async (convId, e) => {
    e.stopPropagation();
    const confirm = window.confirm('Bạn có chắc chắn muốn xóa hội thoại này?');
    if (!confirm) return;
    
    try {
      await aiAPI.deleteConversation(convId);
      toast.success('Đã xóa hội thoại');
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      setPage(1);
      fetchHistory(1);
    } catch {
      toast.error('Lỗi khi xóa hội thoại');
    }
  };

  // Auto-resize textarea
  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="chat-tab">
      <div className="chat-layout">
        {/* Sidebar — conversation list */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>Hội thoại</h3>
            <button
              id="new-chat-btn"
              className="btn btn-ghost btn-sm"
              onClick={startNew}
              title="Hội thoại mới"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="chat-list">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8 }} />
                ))
              : conversations.map((conv) => (
                  <button
                    key={conv._id}
                    className={`chat-list-item ${activeConvId === conv._id ? 'active' : ''}`}
                    onClick={() => loadConversation(conv._id)}
                  >
                    <MessageSquare size={14} />
                    <div>
                      <div className="chat-list-item-title">{conv.title}</div>
                      <div className="chat-list-item-date">
                        {new Date(conv.updatedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <button
                      className="delete-conv-btn"
                      title="Xóa hội thoại"
                      onClick={(e) => handleDeleteConv(conv._id, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </button>
                ))
            }
            
            {hasMore && conversations.length > 0 && (
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ width: '100%', marginTop: '0.5rem' }} 
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <span className="spinner" /> : (
                  <>
                    <ChevronDown size={14} /> Tải thêm
                  </>
                )}
              </button>
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <div className="chat-main">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Sparkles size={48} />
              <h3>Hỏi AI bất kỳ điều gì</h3>
              <p>
                AI StudyMate sẵn sàng giúp bạn giải đáp thắc mắc, giải thích khái niệm,
                hay luyện tập bất kỳ chủ đề nào.
              </p>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`message message-${msg.role === 'user' ? 'user' : 'ai'}`}
                >
                  <div className="message-avatar">
                    {msg.role === 'user' ? user?.name?.charAt(0).toUpperCase() : <Bot size={16} />}
                  </div>
                  <div className="message-bubble">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="message message-ai">
                  <div className="message-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="message-bubble">
                    <div className="ai-typing">
                      <div className="ai-typing-dot" />
                      <div className="ai-typing-dot" />
                      <div className="ai-typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input area */}
          <div className="chat-input-area">
            <form className="chat-input-form" onSubmit={handleSend}>
              <div className="chat-input-wrapper">
                <textarea
                  ref={textareaRef}
                  id="chat-input"
                  placeholder="Nhập câu hỏi..."
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={sending}
                />
              </div>
              <button
                id="chat-send-btn"
                type="submit"
                className="btn btn-primary chat-send-btn"
                disabled={sending || !input.trim()}
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
