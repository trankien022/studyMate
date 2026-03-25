import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, User, Lock, Save, Eye, EyeOff, CheckCircle,
  Camera, Trash2, Upload, Image as ImageIcon
} from 'lucide-react';
import BadgeShowcase from '../../components/BadgeShowcase/BadgeShowcase';
import './Profile.css';

const API_BASE = 'http://localhost:5000';

export default function ProfilePage() {
  const { user, updateProfile, changePassword, uploadAvatar, removeAvatar } = useAuth();
  const navigate = useNavigate();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Avatar upload
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  // Lấy avatar URL đầy đủ
  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) return `${API_BASE}${user.avatar}`;
    return null;
  };

  // Xử lý chọn file avatar
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Chỉ hỗ trợ file ảnh JPG, PNG, WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('File ảnh không được quá 5MB');
      return;
    }

    setAvatarError('');
    setAvatarMsg('');

    // Tạo preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    // Upload ngay
    handleUploadAvatar(file);
  };

  // Upload avatar lên server
  const handleUploadAvatar = async (file) => {
    setAvatarUploading(true);
    setAvatarError('');
    setAvatarMsg('');
    try {
      await uploadAvatar(file);
      setAvatarMsg('Cập nhật ảnh đại diện thành công!');
      setAvatarPreview(null); // Reset preview, dùng URL từ server
      setTimeout(() => setAvatarMsg(''), 3000);
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Upload ảnh thất bại');
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Xóa avatar
  const handleRemoveAvatar = async () => {
    setRemoving(true);
    setAvatarError('');
    setAvatarMsg('');
    try {
      await removeAvatar();
      setAvatarMsg('Đã xóa ảnh đại diện');
      setAvatarPreview(null);
      setShowRemoveConfirm(false);
      setTimeout(() => setAvatarMsg(''), 3000);
    } catch (err) {
      setAvatarError(err.response?.data?.message || 'Xóa ảnh thất bại');
    } finally {
      setRemoving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('avatar-drop-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('avatar-drop-active');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('avatar-drop-active');
    const file = e.dataTransfer.files[0];
    if (file) {
      // Simulate file input selection
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        handleFileSelect({ target: { files: dt.files } });
      }
    }
  };

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

  const avatarUrl = getAvatarUrl();

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
        {/* Avatar Upload Section */}
        <section className="profile-section card animate-fade-in">
          <div className="profile-section-header">
            <Camera size={20} />
            <h2>Ảnh đại diện</h2>
          </div>

          {avatarMsg && (
            <div className="form-success animate-fade-in">
              <CheckCircle size={16} />
              {avatarMsg}
            </div>
          )}
          {avatarError && <div className="auth-error animate-fade-in">{avatarError}</div>}

          <div className="avatar-upload-container">
            {/* Avatar Preview */}
            <div
              className={`avatar-upload-preview ${avatarUploading ? 'uploading' : ''}`}
              onClick={() => !avatarUploading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Chọn ảnh đại diện"
              id="avatar-upload-area"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="avatar-upload-img"
                />
              ) : (
                <div className="avatar-upload-placeholder">
                  <span className="avatar-upload-initial">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Overlay khi hover */}
              <div className="avatar-upload-overlay">
                {avatarUploading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Camera size={24} />
                    <span>Đổi ảnh</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="avatar-upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="avatar-file-input"
              />

              <button
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                id="choose-avatar-btn"
              >
                <Upload size={16} />
                Tải ảnh lên
              </button>

              {user?.avatar && (
                <button
                  className="btn btn-ghost btn-sm avatar-remove-btn"
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={avatarUploading || removing}
                  id="remove-avatar-btn"
                >
                  <Trash2 size={16} />
                  Xóa ảnh
                </button>
              )}
            </div>

            <div className="avatar-upload-hint">
              <ImageIcon size={14} />
              <span>JPG, PNG hoặc WebP. Tối đa 5MB.</span>
            </div>
          </div>
        </section>

        {/* Profile section */}
        <section className="profile-section card animate-fade-in">
          <div className="profile-section-header">
            <User size={20} />
            <h2>Thông tin cá nhân</h2>
          </div>

          <div className="profile-avatar-area">
            <div className="avatar-circle avatar-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="avatar-circle-img" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
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

        {/* Badge & Achievement section */}
        <section className="profile-section card animate-fade-in">
          <BadgeShowcase />
        </section>
      </main>

      {/* Confirm Remove Avatar Dialog */}
      {showRemoveConfirm && (
        <div className="confirm-overlay" onClick={() => !removing && setShowRemoveConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xóa ảnh đại diện?</h3>
            <p>Ảnh đại diện sẽ bị xóa và quay về mặc định. Bạn có chắc chắn?</p>
            <div className="confirm-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={removing}
              >
                Hủy
              </button>
              <button
                className="btn-danger"
                onClick={handleRemoveAvatar}
                disabled={removing}
                id="confirm-remove-avatar-btn"
              >
                {removing ? <span className="spinner" /> : (
                  <>
                    <Trash2 size={16} />
                    Xóa ảnh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
