import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, ArrowRight, Home, Crown } from 'lucide-react';
import './PaymentReturnPage.css';

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | failed

  const responseCode = searchParams.get('vnp_ResponseCode');
  const txnRef = searchParams.get('vnp_TxnRef');
  const amount = searchParams.get('vnp_Amount');
  const bankCode = searchParams.get('vnp_BankCode');
  const isValid = searchParams.get('isValid');

  const processResult = useCallback(async () => {
    if (isValid === 'true' && responseCode === '00') {
      setStatus('success');
      // Refresh user data để cập nhật premium status
      try {
        await refreshUser();
      } catch {
        // Ignore errors
      }
    } else {
      setStatus('failed');
    }
  }, [isValid, responseCode, refreshUser]);

  useEffect(() => {
    // Delay nhẹ để tạo cảm giác transition
    const timer = setTimeout(processResult, 800);
    return () => clearTimeout(timer);
  }, [processResult]);

  const formatAmount = (amt) => {
    if (!amt) return '0';
    return new Intl.NumberFormat('vi-VN').format(parseInt(amt) / 100);
  };

  return (
    <div className="payment-return-page">
      <div className="payment-return-bg-orb payment-return-bg-orb-1" />
      <div className="payment-return-bg-orb payment-return-bg-orb-2" />

      <div className="payment-return-card animate-fade-in-up">
        {status === 'loading' && (
          <div className="payment-status-loading">
            <div className="spinner spinner-lg" />
            <h2>Đang xử lý thanh toán...</h2>
            <p>Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {status === 'success' && (
          <div className="payment-status-success animate-fade-in">
            <div className="payment-icon-wrapper payment-icon-success">
              <CheckCircle size={48} />
            </div>
            <h2>Thanh toán thành công! 🎉</h2>
            <p className="payment-msg">
              Chúc mừng! Tài khoản của bạn đã được nâng cấp lên <strong>Premium</strong>.
            </p>
            <div className="payment-details">
              <div className="payment-detail-row">
                <span>Mã giao dịch</span>
                <strong>{txnRef || 'N/A'}</strong>
              </div>
              <div className="payment-detail-row">
                <span>Số tiền</span>
                <strong>{formatAmount(amount)}đ</strong>
              </div>
              <div className="payment-detail-row">
                <span>Ngân hàng</span>
                <strong>{bankCode || 'N/A'}</strong>
              </div>
              <div className="payment-detail-row">
                <span>Gói</span>
                <strong className="premium-text">
                  <Crown size={14} />
                  Premium 30 ngày
                </strong>
              </div>
            </div>
            <div className="payment-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/dashboard')}
                id="goto-dashboard-btn"
              >
                <Home size={16} />
                Về Dashboard
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="payment-status-failed animate-fade-in">
            <div className="payment-icon-wrapper payment-icon-failed">
              <XCircle size={48} />
            </div>
            <h2>Thanh toán thất bại</h2>
            <p className="payment-msg">
              Giao dịch không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ.
            </p>
            {txnRef && (
              <div className="payment-details">
                <div className="payment-detail-row">
                  <span>Mã giao dịch</span>
                  <strong>{txnRef}</strong>
                </div>
                <div className="payment-detail-row">
                  <span>Mã lỗi</span>
                  <strong>{responseCode || 'N/A'}</strong>
                </div>
              </div>
            )}
            <div className="payment-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/pricing')}
              >
                Thử lại
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/dashboard')}
              >
                Về Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
