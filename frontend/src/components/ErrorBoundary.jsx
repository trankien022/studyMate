import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lỗi ứng dụng:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh',
          backgroundColor: '#1a1a2e', color: 'white', padding: '20px', textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: '#e94560' }}>Đã xảy ra lỗi nghiêm trọng</h2>
          <p style={{ marginBottom: '20px', color: '#a0a0b0' }}>Chúng tôi xin lỗi vì sự bất tiện này. Tham số kỹ thuật lỗi:</p>
          <pre style={{
            backgroundColor: '#16213e', padding: '15px', borderRadius: '8px', overflow: 'auto',
            maxWidth: '100%', marginBottom: '20px', textAlign: 'left', color: '#fffbdf'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 20px', backgroundColor: '#e94560', color: 'white', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
