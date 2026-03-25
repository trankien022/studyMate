import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import './Auth.css';

const validators = {
  email: (v) => {
    if (!v.trim()) return 'Vui lòng nhập email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email không hợp lệ';
    return '';
  },
  password: (v) => {
    if (!v) return 'Vui lòng nhập mật khẩu';
    if (v.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    return '';
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validators[field](value) }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validators[field](form[field]) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all
    const errors = {};
    for (const field of Object.keys(validators)) {
      errors[field] = validators[field](form[field]);
    }
    setFieldErrors(errors);
    setTouched({ email: true, password: true });

    if (Object.values(errors).some((e) => e)) return;

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="auth-container animate-fade-in">
        <div className="auth-branding">
          <div className="auth-branding-content">
            <div className="auth-logo">
              <BookOpen size={32} />
              <span>AI StudyMate</span>
            </div>
            <h1 className="auth-headline">
              Học nhóm thông minh<br />
              cùng <span className="gradient-text">Trí tuệ nhân tạo</span>
            </h1>
            <p className="auth-subline">
              Tạo phòng học, chat với AI, tạo quiz tự động — tất cả
              trong một nền tảng duy nhất.
            </p>
            <div className="auth-features">
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>AI hỗ trợ học tập 24/7</span>
              </div>
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>Tạo quiz thông minh từ mọi chủ đề</span>
              </div>
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>Tóm tắt tài liệu nhanh chóng</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <form className="auth-form" onSubmit={handleSubmit} id="login-form" noValidate>
            <div className="auth-form-header">
              <h2>Chào mừng trở lại</h2>
              <p>Đăng nhập để tiếp tục học tập</p>
            </div>

            {error && (
              <div className="auth-error animate-fade-in" role="alert">
                {error}
              </div>
            )}

            <div className={`form-group ${touched.email && fieldErrors.email ? 'has-error' : ''}`}>
              <label htmlFor="login-email">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`input input-with-icon ${touched.email && fieldErrors.email ? 'input-error' : ''}`}
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  autoComplete="email"
                />
              </div>
              {touched.email && fieldErrors.email && (
                <span className="field-error animate-fade-in">
                  <AlertCircle size={14} />
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <div className={`form-group ${touched.password && fieldErrors.password ? 'has-error' : ''}`}>
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type="password"
                  className={`input input-with-icon ${touched.password && fieldErrors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  autoComplete="current-password"
                />
              </div>
              {touched.password && fieldErrors.password && (
                <span className="field-error animate-fade-in">
                  <AlertCircle size={14} />
                  {fieldErrors.password}
                </span>
              )}
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="auth-switch">
              Chưa có tài khoản?{' '}
              <Link to="/register">Đăng ký ngay</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
