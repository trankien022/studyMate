import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { documentAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import {
  Upload, FileText, Sparkles, Trash2, MessageSquare,
  Send, ChevronDown, ChevronUp, File, FileSpreadsheet,
  Clock, User, AlertCircle, CheckCircle, Loader, X, RefreshCw
} from 'lucide-react';

export default function DocumentTab({ roomId }) {
  const { user } = useAuth();

  // ─── State ─────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState(null);
  
  // Q&A state
  const [askingDoc, setAskingDoc] = useState(null);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState([]);
  const [asking, setAsking] = useState(false);

  const fileInputRef = useRef(null);
  const qaEndRef = useRef(null);

  // ─── Fetch documents ──────────────────────────────────
  useEffect(() => {
    fetchDocuments();
  }, [roomId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data } = await documentAPI.getByRoom(roomId);
      setDocuments(data.data.documents);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh khi có documents đang extracting
  useEffect(() => {
    const hasProcessing = documents.some(d => ['extracting', 'uploaded'].includes(d.status));
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      documentAPI.getByRoom(roomId)
        .then(({ data }) => setDocuments(data.data.documents))
        .catch(() => {});
    }, 3000);

    return () => clearInterval(timer);
  }, [documents, roomId]);

  // ─── Retry extraction ─────────────────────────────────
  const handleRetry = async (docId) => {
    try {
      const { data } = await documentAPI.retry(docId);
      toast.success(data.message);
      setDocuments(prev =>
        prev.map(d =>
          d._id === docId ? { ...d, status: 'extracting', errorMessage: '' } : d
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thử lại');
    }
  };

  // ─── Upload ───────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 10MB)');
      return;
    }

    setUploading(true);
    try {
      const { data } = await documentAPI.upload(file, roomId);
      toast.success(data.message);
      setDocuments(prev => [data.data.document, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi upload tài liệu');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Analyze ──────────────────────────────────────────
  const handleAnalyze = async (docId) => {
    setAnalyzing(true);
    try {
      const { data } = await documentAPI.analyze(docId);
      toast.success(data.message);
      // Cập nhật document trong list
      setDocuments(prev =>
        prev.map(d =>
          d._id === docId
            ? { ...d, analysis: data.data.analysis, status: 'analyzed' }
            : d
        )
      );
      setExpandedAnalysis(docId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi phân tích tài liệu');
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Q&A ──────────────────────────────────────────────
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !askingDoc) return;

    const userQ = question.trim();
    setQuestion('');
    setQaHistory(prev => [...prev, { role: 'user', content: userQ }]);
    setAsking(true);

    try {
      const { data } = await documentAPI.ask(askingDoc, userQ, qaHistory);
      setQaHistory(prev => [...prev, { role: 'assistant', content: data.data.answer }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi hỏi đáp');
      setQaHistory(prev => [...prev, { role: 'assistant', content: '❌ Có lỗi xảy ra, vui lòng thử lại.' }]);
    } finally {
      setAsking(false);
      setTimeout(() => qaEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const openQA = (docId) => {
    setAskingDoc(docId);
    setQaHistory([]);
    setQuestion('');
  };

  // ─── Delete ───────────────────────────────────────────
  const handleDelete = async (docId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này?')) return;

    try {
      await documentAPI.delete(docId);
      toast.success('Đã xóa tài liệu');
      setDocuments(prev => prev.filter(d => d._id !== docId));
      if (askingDoc === docId) setAskingDoc(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa tài liệu');
    }
  };

  // ─── Utils ────────────────────────────────────────────
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <File size={18} style={{ color: 'var(--color-error)' }} />;
    if (['csv', 'xlsx'].includes(ext)) return <FileSpreadsheet size={18} style={{ color: 'var(--color-success)' }} />;
    return <FileText size={18} style={{ color: 'var(--color-primary-500)' }} />;
  };

  const getStatusBadge = (status) => {
    const map = {
      uploaded: { label: 'Đã upload', cls: 'badge', icon: <Clock size={10} /> },
      extracting: { label: 'Đang xử lý...', cls: 'badge badge-warning', icon: <Loader size={10} className="spin-icon" /> },
      extracted: { label: 'Sẵn sàng', cls: 'badge badge-success', icon: <CheckCircle size={10} /> },
      analyzing: { label: 'Đang phân tích...', cls: 'badge badge-warning', icon: <Loader size={10} className="spin-icon" /> },
      analyzed: { label: 'Đã phân tích', cls: 'badge badge-success', icon: <Sparkles size={10} /> },
      error: { label: 'Lỗi', cls: 'badge badge-error', icon: <AlertCircle size={10} /> },
    };
    const s = map[status] || map.uploaded;
    return <span className={s.cls}>{s.icon} {s.label}</span>;
  };

  // ─── Loading state ────────────────────────────────────
  if (loading) {
    return (
      <div className="document-tab animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="document-tab animate-fade-in">
      {/* Header */}
      <div className="doc-header">
        <div className="doc-header-left">
          <h2>
            <FileText size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Tài liệu phòng học
          </h2>
          <span className="badge">{documents.length} tài liệu</span>
        </div>

        <div className="doc-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.csv,.docx"
            onChange={handleUpload}
            style={{ display: 'none' }}
            id="doc-upload-input"
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><span className="spinner" /> Đang upload...</>
            ) : (
              <><Upload size={16} /> Upload tài liệu</>
            )}
          </button>
        </div>
      </div>

      <p className="doc-subtitle">
        Hỗ trợ .txt, .md, .pdf, .csv, .docx — tối đa 10MB. AI sẽ phân tích nội dung và trả lời câu hỏi.
      </p>

      {/* Empty state */}
      {documents.length === 0 && (
        <div className="doc-empty">
          <div className="doc-empty-icon">
            <FileText size={48} />
          </div>
          <h3>Chưa có tài liệu nào</h3>
          <p>Upload tài liệu học tập để AI phân tích và hỗ trợ ôn tập</p>
          <button className="btn btn-primary btn-lg" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Upload tài liệu đầu tiên
          </button>
        </div>
      )}

      {/* Document List */}
      <div className="doc-list stagger-children">
        {documents.map((doc) => (
          <div key={doc._id} className="doc-card card">
            <div className="doc-card-header">
              <div className="doc-card-info">
                {getFileIcon(doc.originalName)}
                <div className="doc-card-meta">
                  <span className="doc-card-name">{doc.originalName}</span>
                  <span className="doc-card-details">
                    {formatSize(doc.size)} • {formatDate(doc.createdAt)}
                    {doc.uploadedBy && ` • ${doc.uploadedBy.name}`}
                  </span>
                </div>
              </div>

              <div className="doc-card-actions">
                {getStatusBadge(doc.status)}

                {['extracted', 'analyzed'].includes(doc.status) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAnalyze(doc._id)}
                    disabled={analyzing}
                    title="Phân tích bằng AI"
                  >
                    {analyzing ? <span className="spinner" /> : <><Sparkles size={14} /> Phân tích AI</>}
                  </button>
                )}

                {['extracted', 'analyzed'].includes(doc.status) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openQA(doc._id)}
                    title="Hỏi đáp về tài liệu"
                  >
                    <MessageSquare size={14} /> Hỏi AI
                  </button>
                )}

                {doc.status === 'error' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRetry(doc._id)}
                    title="Thử lại trích xuất text"
                  >
                    <RefreshCw size={14} /> Thử lại
                  </button>
                )}

                {(doc.uploadedBy?._id === user?._id) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(doc._id)}
                    title="Xóa tài liệu"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Analysis Section (expandable) */}
            {doc.analysis?.analyzedAt && (
              <div className="doc-analysis-section">
                <button
                  className="doc-analysis-toggle"
                  onClick={() => setExpandedAnalysis(expandedAnalysis === doc._id ? null : doc._id)}
                >
                  <Sparkles size={14} />
                  <span>Kết quả phân tích AI</span>
                  {expandedAnalysis === doc._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expandedAnalysis === doc._id && (
                  <div className="doc-analysis-content animate-fade-in">
                    {doc.analysis.summary && (
                      <div className="analysis-block">
                        <h4>📝 Tóm tắt</h4>
                        <div className="analysis-text"><ReactMarkdown>{doc.analysis.summary}</ReactMarkdown></div>
                      </div>
                    )}

                    {doc.analysis.keyPoints?.length > 0 && (
                      <div className="analysis-block">
                        <h4>🔑 Ý chính</h4>
                        <ul className="analysis-list">
                          {doc.analysis.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {doc.analysis.suggestedQuizTopics?.length > 0 && (
                      <div className="analysis-block">
                        <h4>🎯 Gợi ý chủ đề Quiz</h4>
                        <div className="quiz-topic-chips">
                          {doc.analysis.suggestedQuizTopics.map((topic, i) => (
                            <span key={i} className="badge badge-primary-subtle">{topic}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Q&A Modal */}
      {askingDoc && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setAskingDoc(null)}>
          <div className="qa-modal animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="qa-modal-header">
              <h3>
                <MessageSquare size={18} />
                Hỏi đáp về tài liệu
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAskingDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="qa-messages">
              {qaHistory.length === 0 && (
                <div className="qa-empty">
                  <Sparkles size={24} style={{ color: 'var(--color-primary-500)' }} />
                  <p>Hãy hỏi bất cứ điều gì về nội dung tài liệu này!</p>
                </div>
              )}

              {qaHistory.map((msg, i) => (
                <div key={i} className={`qa-message ${msg.role}`}>
                  <div className="qa-avatar">
                    {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div className="qa-bubble">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {asking && (
                <div className="qa-message assistant">
                  <div className="qa-avatar"><Sparkles size={14} /></div>
                  <div className="qa-bubble"><span className="spinner" /> Đang suy nghĩ...</div>
                </div>
              )}
              <div ref={qaEndRef} />
            </div>

            <form className="qa-input-form" onSubmit={handleAsk}>
              <input
                type="text"
                className="input"
                placeholder="Hỏi về nội dung tài liệu..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={asking}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={asking || !question.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
