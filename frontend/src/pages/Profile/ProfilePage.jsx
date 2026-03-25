import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, User, Lock, Save, Eye, EyeOff, CheckCircle
} from 'lucide-react';
import './Profile.css';

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      setProfileMsg('Cập nhật thành công!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');

    if (newPassword !== confirmPassword) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setChangingPw(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMsg('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-header glass">
        <button
          id="back-to-dashboard"
          className="btn btn-ghost btn-icon"
          onClick={() => navigate('/dashboard')}
          title="Quay lại"
        >
          <ArrowLeft size={20} />
        </button>
        <h1>Cài đặt tài khoản</h1>
      </header>

      <main className="profile-main">
        {/* Profile section */}
        <section className="profile-section card animate-fade-in">
          <div className="profile-section-header">
            <User size={20} />
            <h2>Thông tin cá nhân</h2>
          </div>

          <div className="profile-avatar-area">
            <div className="avatar-circle avatar-xl">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-avatar-info">
              <span className="profile-email">{user?.email}</span>
              <span className="profile-joined">
                Tham gia: {new Date(user?.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} id="update-profile-form">
            {profileMsg && (
              <div className="form-success animate-fade-in">
                <CheckCircle size={16} />
                {profileMsg}
              </div>
            )}
            {profileError && <div className="auth-error animate-fade-in">{profileError}</div>}

            <div className="form-group">
              <label htmlFor="profile-name">Tên hiển thị</label>
              <input
                id="profile-name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
                placeholder="Tên của bạn"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || name.trim() === user?.name}
              id="save-profile-btn"
            >
              {saving ? <span className="spinner" /> : (
                <>
                  <Save size={16} />
                  Lưu thay đổi
                </>
              )}
            </button>
          </form>
        </section>

        {/* Password section */}
        <section className="profile-section card animate-fade-in">
          <div className="profile-section-header">
            <Lock size={20} />
            <h2>Đổi mật khẩu</h2>
          </div>

          <form onSubmit={handleChangePassword} id="change-password-form">
            {pwMsg && (
              <div className="form-success animate-fade-in">
                <CheckCircle size={16} />
                {pwMsg}
              </div>
            )}
            {pwError && <div className="auth-error animate-fade-in">{pwError}</div>}

            <div className="form-group">
              <label htmlFor="current-password">Mật khẩu hiện tại</label>
              <div className="input-password-wrapper">
                <input
                  id="current-password"
                  type={showCurrentPw ? 'text' : 'password'}
                  className="input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  tabIndex={-1}
                >
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-password">Mật khẩu mới</label>
              <div className="input-password-wrapper">
                <input
                  id="new-password"
                  type={showNewPw ? 'text' : 'password'}
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Ít nhất 6 ký tự"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPw(!showNewPw)}
                  tabIndex={-1}
                >
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
              <input
                id="confirm-password"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={changingPw || !currentPassword || !newPassword || !confirmPassword}
              id="change-password-btn"
            >
              {changingPw ? <span className="spinner" /> : (
                <>
                  <Lock size={16} />
                  Đổi mật khẩu
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
