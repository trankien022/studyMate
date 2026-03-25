import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI } from '../../services/api';
import { Brain, ArrowLeft, User, Clock, BookOpen } from 'lucide-react';

export default function QuizSharePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data } = await quizAPI.getDetail(id);
        setQuiz(data.data.quiz);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải quiz. Bạn có thể cần đăng nhập và là thành viên phòng.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--color-bg-primary)',
      }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--color-text-secondary)' }}>Đang tải quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--color-bg-primary)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <Brain size={48} style={{ opacity: 0.3, color: 'var(--color-text-muted)' }} />
        <h2 style={{ color: 'var(--color-text-primary)' }}>Không thể truy cập quiz</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-primary)',
      padding: '2rem',
    }}>
      <div className="card animate-fade-in" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Brain size={28} style={{ color: 'var(--color-primary-500)' }} />
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: '0.5rem' }}>
            {quiz.topic}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Brain size={14} /> {quiz.questionCount} câu hỏi
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} /> {quiz.createdBy?.name}
            </span>
          </div>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: 'var(--text-sm)' }}>
          Quiz này được chia sẻ từ AI StudyMate. Đăng nhập và tham gia phòng để làm bài!
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Trang chủ
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            <BookOpen size={16} />
            Bắt đầu học
          </button>
        </div>
      </div>
    </div>
  );
}
