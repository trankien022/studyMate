import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Crown, Check, X, Zap, MessageSquare, Brain, FileText,
  BarChart3, BookOpen, ArrowLeft, Sparkles, Shield,
  ChevronDown, Lock, CreditCard, Layers
} from 'lucide-react';
import { paymentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './PricingPage.css';

const PREMIUM_PRICE = 99000;

const features = [
  {
    name: 'Phòng học',
    free: 'Tối đa 3 phòng',
    premium: 'Không giới hạn',
    icon: BookOpen,
    freeShort: '3 phòng',
    premiumShort: 'Unlimited',
  },
  {
    name: 'AI Chat',
    free: '10 tin nhắn/ngày',
    premium: 'Không giới hạn',
    icon: MessageSquare,
    freeShort: '10/ngày',
    premiumShort: 'Unlimited',
  },
  {
    name: 'Tạo Quiz',
    free: '3 quiz/ngày',
    premium: 'Không giới hạn',
    icon: Zap,
    freeShort: '3/ngày',
    premiumShort: 'Unlimited',
  },
  {
    name: 'Số câu hỏi/quiz',
    free: 'Tối đa 10 câu',
    premium: 'Tối đa 30 câu',
    icon: FileText,
    freeShort: '10 câu',
    premiumShort: '30 câu',
  },
  {
    name: 'Deep Explanation AI',
    free: false,
    premium: true,
    icon: Brain,
  },
  {
    name: 'Xuất kết quả Quiz',
    free: false,
    premium: true,
    icon: FileText,
  },
  {
    name: 'Flashcard Mode',
    free: false,
    premium: true,
    icon: BookOpen,
  },
  {
    name: 'Analytics chi tiết',
    free: false,
    premium: true,
    icon: BarChart3,
  },
];

const faqs = [
  {
    q: 'Thanh toán có an toàn không?',
    a: 'Hoàn toàn an toàn. Chúng tôi sử dụng cổng thanh toán VNPay với bảo mật SSL 256-bit, đạt chuẩn PCI DSS — tiêu chuẩn bảo mật thanh toán quốc tế.',
  },
  {
    q: 'Tôi có thể hủy gói Premium bất kỳ lúc nào không?',
    a: 'Gói Premium có thời hạn 30 ngày và không tự động gia hạn. Khi hết hạn, tài khoản sẽ tự động chuyển về Free mà không mất dữ liệu.',
  },
  {
    q: 'Nếu tôi nâng cấp giữa chừng, dữ liệu có bị mất không?',
    a: 'Không. Toàn bộ phòng học, quiz, ghi chú và hội thoại AI của bạn đều được giữ nguyên khi nâng cấp hoặc khi hết hạn Premium.',
  },
  {
    q: 'Premium khác gì so với Free?',
    a: 'Premium mở khóa AI Chat không giới hạn, quiz nâng cao với 30 câu hỏi, Deep Explanation AI, Flashcard Mode, Analytics chi tiết, và xuất kết quả quiz.',
  },
];

const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price);

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const isPremium = user?.isPremium && user?.premiumExpiry && new Date(user.premiumExpiry) > new Date();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await paymentAPI.createPaymentUrl({ amount: PREMIUM_PRICE });
      window.location.href = data.data.paymentUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tạo thanh toán');
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page">
      {/* ── Animated Background ──────────────────────── */}
      <div className="pricing-bg" aria-hidden="true">
        <div className="pricing-bg-orb pricing-bg-orb-1" />
        <div className="pricing-bg-orb pricing-bg-orb-2" />
        <div className="pricing-bg-orb pricing-bg-orb-3" />
        <div className="pricing-bg-orb pricing-bg-orb-4" />
        <div className="pricing-bg-mesh" />
      </div>

      <div className="pricing-content">
        {/* ── Nav ─────────────────────────────────────── */}
        <nav className="pricing-nav" aria-label="Pricing navigation">
          <button
            className="pricing-nav-back"
            onClick={() => navigate('/dashboard')}
            id="back-to-dashboard"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="pricing-nav-logo">
            <Sparkles size={18} />
            AI StudyMate
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────── */}
        <section className="pricing-hero animate-fade-in">
          <div className="pricing-hero-badge">
            <Crown size={15} />
            <span>Nâng cấp trải nghiệm học tập</span>
          </div>
          <h1>
            Mở khóa{' '}
            <span className="gradient-text">toàn bộ sức mạnh</span>
            <br />
            của AI StudyMate
          </h1>
          <p className="pricing-hero-sub">
            Học hiệu quả hơn gấp 10 lần với AI không giới hạn, quiz nâng cao, flashcard thông minh và phân tích học tập chi tiết.
          </p>
        </section>

        {/* ── Pricing Cards ──────────────────────────── */}
        <section className="pricing-cards pricing-stagger" aria-label="Pricing plans">
          {/* Free Plan */}
          <div className="pricing-card pricing-card-free">
            <div className="pricing-card-icon">
              <Layers size={22} />
            </div>
            <div className="pricing-card-header">
              <h3>Free</h3>
              <p className="pricing-card-desc">Cho người mới bắt đầu</p>
            </div>

            <div className="pricing-card-price">
              <span className="price-amount">0</span>
              <span className="price-currency">đ</span>
              <span className="price-period">/ mãi mãi</span>
            </div>

            <ul className="pricing-feature-list">
              {features.map((f, i) => (
                <li key={i} className={f.free === false ? 'disabled' : ''}>
                  <span className={`feature-check ${f.free === false ? 'feature-check-no' : 'feature-check-yes'}`}>
                    {f.free === false
                      ? <X size={12} />
                      : <Check size={12} />
                    }
                  </span>
                  <span className="feature-text">
                    {typeof f.free === 'string' ? (
                      <><strong>{f.name}:</strong> {f.free}</>
                    ) : (
                      f.name
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <button className="pricing-btn pricing-btn-free" disabled>
              Gói hiện tại
            </button>
          </div>

          {/* Premium Plan */}
          <div className="pricing-card pricing-card-premium">
            <div className="pricing-popular-badge">
              <Crown size={13} />
              Phổ biến nhất
            </div>

            <div className="pricing-card-icon">
              <Crown size={22} />
            </div>
            <div className="pricing-card-header">
              <h3>Premium</h3>
              <p className="pricing-card-desc">Cho người học nghiêm túc</p>
            </div>

            <div className="pricing-card-price">
              <span className="price-amount">{formatPrice(PREMIUM_PRICE)}</span>
              <span className="price-currency">đ</span>
              <span className="price-period">/ 30 ngày</span>
            </div>

            <ul className="pricing-feature-list">
              {features.map((f, i) => (
                <li key={i}>
                  <span className="feature-check feature-check-premium">
                    <Check size={12} />
                  </span>
                  <span className="feature-text">
                    {typeof f.premium === 'string' ? (
                      <><strong>{f.name}:</strong> {f.premium}</>
                    ) : (
                      f.name
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="premium-active-info">
                <div className="premium-status-badge">
                  <Shield size={15} />
                  <span>Đang sử dụng Premium</span>
                </div>
                <p className="premium-expiry">
                  Hết hạn: {new Date(user.premiumExpiry).toLocaleDateString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })}
                </p>
              </div>
            ) : (
              <button
                className="pricing-btn pricing-btn-upgrade"
                onClick={handleUpgrade}
                disabled={loading}
                id="upgrade-premium-btn"
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Zap size={17} />
                    Nâng cấp Premium
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* ── Feature Comparison Table ────────────────── */}
        <section className="pricing-comparison animate-fade-in" aria-label="Feature comparison">
          <h2>So sánh chi tiết tính năng</h2>
          <p className="pricing-comparison-sub">Xem đầy đủ những gì bạn nhận được với mỗi gói</p>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Tính năng</th>
                  <th>Free</th>
                  <th className="premium-col">
                    <Crown size={13} /> Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i}>
                    <td className="feature-name">
                      <f.icon size={16} />
                      {f.name}
                    </td>
                    <td>
                      {f.free === false
                        ? <X size={16} className="feature-icon-no" />
                        : typeof f.free === 'string'
                          ? f.free
                          : <Check size={16} className="feature-icon-yes" />
                      }
                    </td>
                    <td className="premium-col">
                      {f.premium === true
                        ? <Check size={16} />
                        : f.premium
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────── */}
        <section className="pricing-faq animate-fade-in" aria-label="Frequently asked questions">
          <h2>Câu hỏi thường gặp</h2>
          <p className="pricing-faq-sub">Giải đáp mọi thắc mắc trước khi nâng cấp</p>

          <div className="pricing-stagger">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`faq-item ${openFaq === i ? 'active' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  id={`faq-toggle-${i}`}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  {faq.q}
                  <ChevronDown size={18} className="faq-chevron" />
                </button>
                <div
                  className="faq-answer"
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-toggle-${i}`}
                >
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust / Footer ──────────────────────────── */}
        <section className="pricing-trust animate-fade-in" aria-label="Security assurance">
          <div className="pricing-trust-icons">
            <div className="trust-icon-item">
              <div className="trust-icon-circle">
                <Shield size={20} />
              </div>
              <span className="trust-icon-label">SSL 256-bit</span>
            </div>
            <div className="trust-icon-item">
              <div className="trust-icon-circle">
                <Lock size={20} />
              </div>
              <span className="trust-icon-label">PCI DSS</span>
            </div>
            <div className="trust-icon-item">
              <div className="trust-icon-circle">
                <CreditCard size={20} />
              </div>
              <span className="trust-icon-label">VNPay</span>
            </div>
          </div>
          <p className="pricing-trust-text">
            Thanh toán an toàn và bảo mật qua <strong>VNPay</strong> — Đối tác thanh toán hàng đầu Việt Nam
          </p>
        </section>
      </div>
    </div>
  );
}
