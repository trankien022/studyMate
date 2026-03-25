import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Mail, Lock, User, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import './Auth.css';

const validators = {
  name: (v) => {
    if (!v.trim()) return 'Vui lòng nhập họ tên';
    if (v.trim().length < 2) return 'Tên phải có ít nhất 2 ký tự';
    if (v.trim().length > 50) return 'Tên tối đa 50 ký tự';
    return '';
  },
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
  confirm: (v, form) => {
    if (!v) return 'Vui lòng xác nhận mật khẩu';
    if (v !== form.password) return 'Mật khẩu xác nhận không khớp';
    return '';
  },
};

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Yếu', color: 'var(--color-error)' };
  if (score <= 2) return { score: 2, label: 'Trung bình', color: 'var(--color-warning)' };
  if (score <= 3) return { score: 3, label: 'Khá', color: '#eab308' };
  if (score <= 4) return { score: 4, label: 'Mạnh', color: 'var(--color-success)' };
  return { score: 5, label: 'Rất mạnh', color: 'var(--color-success)' };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);

    // Validate if field was touched
    if (touched[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: validators[field](value, newForm),
      }));
    }

    // Re-validate confirm if password changes
    if (field === 'password' && touched.confirm) {
      setFieldErrors((prev) => ({
        ...prev,
        confirm: validators.confirm(newForm.confirm, newForm),
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validators[field](form[field], form),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const errors = {};
    for (const field of Object.keys(validators)) {
      errors[field] = validators[field](form[field], form);
    }
    setFieldErrors(errors);
    setTouched({ name: true, email: true, password: true, confirm: true });

    // Check if any errors
    if (Object.values(errors).some((e) => e)) return;

    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = getPasswordStrength(form.password);

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
              Bắt đầu hành trình<br />
              <span className="gradient-text">Học tập thông minh</span>
            </h1>
            <p className="auth-subline">
              Tạo tài khoản miễn phí và trải nghiệm sức mạnh của AI
              trong việc học nhóm.
            </p>
            <div className="auth-features">
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>Hoàn toàn miễn phí</span>
              </div>
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>Tạo phòng học không giới hạn</span>
              </div>
              <div className="auth-feature">
                <Sparkles size={16} />
                <span>Mời bạn bè cùng học</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <form className="auth-form" onSubmit={handleSubmit} id="register-form" noValidate>
            <div className="auth-form-header">
              <h2>Tạo tài khoản</h2>
              <p>Chỉ cần vài bước đơn giản</p>
            </div>

            {error && (
              <div className="auth-error animate-fade-in" role="alert">
                {error}
              </div>
            )}

            <div className={`form-group ${touched.name && fieldErrors.name ? 'has-error' : ''}`}>
              <label htmlFor="register-name">Họ tên</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="register-name"
                  type="text"
                  className={`input input-with-icon ${touched.name && fieldErrors.name ? 'input-error' : ''}`}
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  autoComplete="name"
                />
              </div>
              {touched.name && fieldErrors.name && (
                <span className="field-error animate-fade-in">
                  <AlertCircle size={14} />
                  {fieldErrors.name}
                </span>
              )}
            </div>

            <div className={`form-group ${touched.email && fieldErrors.email ? 'has-error' : ''}`}>
              <label htmlFor="register-email">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="register-email"
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
              <label htmlFor="register-password">Mật khẩu</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="register-password"
                  type="password"
                  className={`input input-with-icon ${touched.password && fieldErrors.password ? 'input-error' : ''}`}
                  placeholder="Tối thiểu 6 ký tự"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  autoComplete="new-password"
                />
              </div>
              {touched.password && fieldErrors.password && (
                <span className="field-error animate-fade-in">
                  <AlertCircle size={14} />
                  {fieldErrors.password}
                </span>
              )}
              {form.password && !fieldErrors.password && (
                <div className="password-strength animate-fade-in">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{ width: `${(pwStrength.score / 5) * 100}%`, background: pwStrength.color }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className={`form-group ${touched.confirm && fieldErrors.confirm ? 'has-error' : ''}`}>
              <label htmlFor="register-confirm">Xác nhận mật khẩu</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="register-confirm"
                  type="password"
                  className={`input input-with-icon ${touched.confirm && fieldErrors.confirm ? 'input-error' : ''}`}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirm}
                  onChange={(e) => handleChange('confirm', e.target.value)}
                  onBlur={() => handleBlur('confirm')}
                  autoComplete="new-password"
                />
              </div>
              {touched.confirm && fieldErrors.confirm && (
                <span className="field-error animate-fade-in">
                  <AlertCircle size={14} />
                  {fieldErrors.confirm}
                </span>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Đăng ký
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="auth-switch">
              Đã có tài khoản?{' '}
              <Link to="/login">Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
