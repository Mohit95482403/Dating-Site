import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import FormField from '../components/auth/FormField';
import FormError from '../components/auth/FormError';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import api from '../services/api';
import './AuthPages.css';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      setDevToken(null);

      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      const data = response.data?.data || response.data;
      setSuccessMessage(
        response.data?.message || 'If an account exists with this email, a password reset link has been dispatched.'
      );
      if (data?.devToken) {
        setDevToken(data.devToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to process recovery request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <Container>
        <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
          <div className="auth-card glass-panel">
            <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div className="auth-logo-badge" style={{ margin: '0 auto 1rem' }}>
                <Mail size={24} color="#ff3366" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Reset Your Password
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: '1.5rem' }}>
                <FormError message={error} />
              </div>
            )}

            {successMessage ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ marginBottom: '1rem', color: '#10b981', display: 'flex', justifyContent: 'center' }}>
                  <CheckCircle size={48} />
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Check Your Email</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  {successMessage}
                </p>

                {devToken && (
                  <div
                    style={{
                      background: 'rgba(255, 51, 102, 0.1)',
                      border: '1px dashed #ff3366',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1.5rem',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#ff4d79', fontWeight: 700, marginBottom: '0.5rem' }}>
                      ⚡ Development Quick-Link:
                    </div>
                    <Link
                      to={`/reset-password?token=${devToken}`}
                      style={{ color: '#fff', fontSize: '0.85rem', wordBreak: 'break-all', textDecoration: 'underline' }}
                    >
                      /reset-password?token={devToken}
                    </Link>
                  </div>
                )}

                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" fullWidth>
                    <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Return to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <FormField id="recovery-email" label="Registered Email" required>
                    <input
                      id="recovery-email"
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                      required
                    />
                  </FormField>
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={isSubmitting}
                  style={{ marginBottom: '1.5rem' }}
                >
                  {isSubmitting ? (
                    'Sending Link...'
                  ) : (
                    <>
                      <Send size={18} style={{ marginRight: '8px' }} /> Send Reset Link
                    </>
                  )}
                </Button>

                <div style={{ textAlign: 'center' }}>
                  <Link
                    to="/login"
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;
