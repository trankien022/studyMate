import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { quizAPI } from '../../../services/api';
import {
  Brain, Plus, ArrowLeft, ArrowRight,
  CheckCircle, XCircle, Trophy, Clock, User, Trash2, RefreshCw
} from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizTab({ roomId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({ topic: '', count: 5 });
  const [generating, setGenerating] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizDetail, setQuizDetail] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchQuizzes = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await quizAPI.getByRoom(roomId, pageNum, 12);
      const newQuizzes = data.data.quizzes;
      
      if (pageNum === 1) setQuizzes(newQuizzes);
      else setQuizzes((prev) => [...prev, ...newQuizzes]);
      
      setHasMore(pageNum < data.data.pagination.totalPages);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách quiz');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);



  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuizzes(nextPage);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await quizAPI.generate({
        roomId,
        topic: generateForm.topic,
        count: parseInt(generateForm.count, 10),
      });
      setShowGenerate(false);
      setGenerateForm({ topic: '', count: 5 });
      fetchQuizzes(1);
      toast.success('Tạo quiz thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi khi AI tạo quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    try {
      await quizAPI.delete(quizId);
      toast.success('Đã xóa quiz');
      setPage(1);
      fetchQuizzes(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa quiz');
    }
  };

  const openQuiz = async (quizId) => {
    setActiveQuiz(quizId);
    try {
      const { data } = await quizAPI.getDetail(quizId);
      setQuizDetail(data.data.quiz);
      setSubmitted(data.data.submitted);
      setResult(data.data.result);
      const len = data.data.quiz.questions.length;
      setAnswers(data.data.result ? data.data.result.answers : new Array(len).fill(-1));

      // If already submitted, load results
      if (data.data.submitted) {
        loadLeaderboard(quizId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải chi tiết quiz');
      setActiveQuiz(null);
    }
  };

  const loadLeaderboard = async (quizId) => {
    try {
      const { data } = await quizAPI.getResults(quizId);
      setLeaderboard(data.data.leaderboard);
    } catch {
      toast.error('Lỗi khi tải bảng xếp hạng');
    }
  };

  const selectAnswer = (questionIdx, optionIdx) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[questionIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.some((a) => a === -1)) return;
    setSubmitting(true);
    try {
      const { data } = await quizAPI.submit(activeQuiz, answers);
      setResult(data.data.result);
      // details available in data.data.details if needed
      setSubmitted(true);
      loadLeaderboard(activeQuiz);
      // Reload quiz detail to get correct answers
      const detailRes = await quizAPI.getDetail(activeQuiz);
      setQuizDetail(detailRes.data.data.quiz);
      toast.success('Nộp bài thành công!');
    } catch {
      toast.error('Có lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    // Reset answers
    const len = quizDetail.questions.length;
    setAnswers(new Array(len).fill(-1));
    setSubmitted(false);
    setResult(null);

    toast('Hãy chọn lại đáp án và nộp bài nhé!', { icon: '🔄' });
  };

  const goBack = () => {
    setActiveQuiz(null);
    setQuizDetail(null);
    setAnswers([]);
    setSubmitted(false);
    setResult(null);
    setLeaderboard([]);
  };

  // ─── Quiz Detail View ──────────────────────────────────
  if (activeQuiz && quizDetail) {
    const answeredCount = answers.filter((a) => a !== -1).length;
    const totalQuestions = quizDetail.questions.length;

    return (
      <div className="quiz-tab animate-fade-in">
        <div className="quiz-detail">
          <div className="quiz-detail-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="btn btn-ghost btn-icon" onClick={goBack}>
                <ArrowLeft size={20} />
              </button>
              <h2>{quizDetail.topic}</h2>
            </div>
            <div className="quiz-progress">
              <span>
                {submitted
                  ? `${result?.score}/${result?.total} câu đúng`
                  : `${answeredCount}/${totalQuestions}`}
              </span>
              <div className="quiz-progress-bar">
                <div
                  className="quiz-progress-fill"
                  style={{
                    width: `${submitted
                      ? (result?.score / result?.total) * 100
                      : (answeredCount / totalQuestions) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Result card */}
          {submitted && result && (
            <div className="quiz-result-card card animate-fade-in-up">
              <div className="score-circle">
                <span className="score-number">{result.percentage}%</span>
                <span className="score-label">Điểm số</span>
              </div>
              <h3>
                {result.percentage >= 80
                  ? '🎉 Xuất sắc!'
                  : result.percentage >= 50
                  ? '👍 Khá tốt!'
                  : '💪 Cần cố gắng thêm!'}
              </h3>
              <p>
                Bạn trả lời đúng {result.score}/{result.total} câu hỏi
              </p>
            </div>
          )}

          {/* Questions */}
          {quizDetail.questions.map((q, qi) => {
            return (
              <div key={qi} className="question-card">
                <div className="question-number">Câu {qi + 1}</div>
                <div className="question-text">{q.question}</div>
                <div className="options-list">
                  {q.options.map((opt, oi) => {
                    let cls = 'option-btn';
                    if (submitted && q.correctIndex !== undefined) {
                      if (oi === q.correctIndex) cls += ' correct';
                      else if (oi === answers[qi] && oi !== q.correctIndex) cls += ' wrong';
                    } else if (answers[qi] === oi) {
                      cls += ' selected';
                    }
                    return (
                      <button
                        key={oi}
                        className={cls}
                        onClick={() => selectAnswer(qi, oi)}
                        disabled={submitted}
                        type="button"
                      >
                        <span className="option-letter">{LETTERS[oi]}</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="explanation">💡 {q.explanation}</div>
                )}
              </div>
            );
          })}

          {/* Submit/Retry button */}
          <div className="quiz-submit-area" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {!submitted ? (
              <button
                id="submit-quiz-btn"
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting || answers.some((a) => a === -1)}
              >
                {submitting ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Nộp bài ({answeredCount}/{totalQuestions})
                  </>
                )}
              </button>
            ) : (
              <button
                id="retry-quiz-btn"
                className="btn btn-secondary btn-lg"
                onClick={handleRetry}
              >
                <RefreshCw size={18} />
                Làm lại Quiz
              </button>
            )}
          </div>

          {/* Leaderboard */}
          {submitted && leaderboard.length > 0 && (
            <div className="leaderboard animate-fade-in">
              <h3>
                <Trophy size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Bảng xếp hạng
              </h3>
              <div className="leaderboard-list">
                {leaderboard.map((entry) => (
                  <div key={entry.rank} className="leaderboard-item">
                    <span className="leaderboard-rank">{entry.rank}</span>
                    <div className="avatar-circle avatar-sm">
                      {entry.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="leaderboard-user">{entry.user?.name}</span>
                    <span className="leaderboard-score">
                      {entry.score}/{entry.total} ({entry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Quiz List View ─────────────────────────────────────
  return (
    <div className="quiz-tab animate-fade-in">
      <div className="quiz-header">
        <h2>
          <Brain size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Quiz
        </h2>
        <button
          id="toggle-generate-quiz"
          className="btn btn-primary"
          onClick={() => setShowGenerate(!showGenerate)}
        >
          <Plus size={16} />
          Tạo Quiz mới
        </button>
      </div>

      {/* Generate form */}
      {showGenerate && (
        <div className="quiz-generate-card card animate-fade-in-up">
          <h3>
            <Brain size={16} />
            AI sẽ tạo quiz cho bạn
          </h3>
          <form className="quiz-generate-form" onSubmit={handleGenerate}>
            <div className="form-group">
              <label htmlFor="quiz-topic">Chủ đề</label>
              <input
                id="quiz-topic"
                type="text"
                className="input"
                placeholder="VD: Phương trình bậc 2, Lịch sử Việt Nam..."
                value={generateForm.topic}
                onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                required
              />
            </div>
            <div className="form-group form-group-small">
              <label htmlFor="quiz-count">Số câu</label>
              <input
                id="quiz-count"
                type="number"
                className="input"
                min={1}
                max={15}
                value={generateForm.count}
                onChange={(e) => setGenerateForm({ ...generateForm, count: e.target.value })}
              />
            </div>
            <button
              id="generate-quiz-submit"
              type="submit"
              className="btn btn-primary"
              disabled={generating}
              style={{ alignSelf: 'flex-end', height: 42 }}
            >
              {generating ? <span className="spinner" /> : 'Tạo Quiz'}
            </button>
          </form>
        </div>
      )}

      {/* Quiz list */}
      <div className="quiz-list stagger-children">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            ))
          : quizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="quiz-list-item"
                onClick={() => openQuiz(quiz._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openQuiz(quiz._id)}
              >
                <div className="quiz-list-item-info">
                  <h4>{quiz.topic}</h4>
                  <div className="quiz-list-item-meta">
                    <span>
                      <Brain size={12} style={{ marginRight: 4 }} />
                      {quiz.questionCount} câu
                    </span>
                    <span>
                      <User size={12} style={{ marginRight: 4 }} />
                      {quiz.createdBy?.name}
                    </span>
                    <span>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {new Date(quiz.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn-icon-sm"
                    title="Xóa quiz"
                    onClick={(e) => handleDeleteQuiz(quiz._id, e)}
                    style={{ opacity: 1 }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            ))
        }

        {!loading && quizzes.length === 0 && (
          <div className="empty-state">
            <Brain size={48} />
            <h3>Chưa có quiz nào</h3>
            <p>Tạo quiz mới bằng AI để ôn tập kiến thức!</p>
          </div>
        )}

        {hasMore && quizzes.length > 0 && (
          <div className="load-more-container" style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleLoadMore} 
              disabled={loadingMore}
            >
              {loadingMore ? <span className="spinner" /> : 'Tải thêm...'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
