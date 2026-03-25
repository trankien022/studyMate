import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import RoomPage from './pages/Room/RoomPage';
import ProfilePage from './pages/Profile/ProfilePage';
import QuizSharePage from './pages/Quiz/QuizSharePage';
import PricingPage from './pages/Pricing/PricingPage';
import PaymentReturnPage from './pages/Payment/PaymentReturnPage';
import DirectMessagePage from './pages/DirectMessage/DirectMessagePage';
import DiscoverPage from './pages/Discover/DiscoverPage';
import AITutorPage from './pages/AITutor/AITutorPage';
import KnowledgeMapPage from './pages/KnowledgeMap/KnowledgeMapPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--color-text-secondary)' }}>Đang tải...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:id"
        element={
          <ProtectedRoute>
            <RoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz-share/:id"
        element={
          <ProtectedRoute>
            <QuizSharePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pricing"
        element={
          <ProtectedRoute>
            <PricingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/vnpay-return"
        element={
          <ProtectedRoute>
            <PaymentReturnPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dm"
        element={
          <ProtectedRoute>
            <DirectMessagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dm/:partnerId"
        element={
          <ProtectedRoute>
            <DirectMessagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <DiscoverPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutor"
        element={
          <ProtectedRoute>
            <AITutorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-map"
        element={
          <ProtectedRoute>
            <KnowledgeMapPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Toaster position="top-right" toastOptions={{
              style: {
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)'
              }
            }} />
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
