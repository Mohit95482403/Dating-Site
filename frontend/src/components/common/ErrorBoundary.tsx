import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Button from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#0a0b10',
          color: '#f8fafc'
        }}>
          <div style={{
            maxWidth: '500px',
            background: 'rgba(23, 26, 40, 0.9)',
            border: '1px solid rgba(255, 51, 102, 0.3)',
            borderRadius: '24px',
            padding: '3rem 2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(255, 51, 102, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#ff3366',
              fontSize: '1.8rem'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 800 }}>
              Something unexpected happened
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              We apologize for the inconvenience. An unexpected error occurred while loading this page.
            </p>
            <Button variant="primary" onClick={this.handleReset}>
              Return to Safety
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
