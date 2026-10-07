import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import FormField from '../components/auth/FormField';
import FormError from '../components/auth/FormError';
import PasswordInput from '../components/auth/PasswordInput';
import { KeyRound, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';
import './AuthPages.css';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setError('No password recovery token provided. Please request a new link.');
      return;
    }

    const verifyToken = async () => {
      try {
        await api.get(`/auth/verify-reset-token/${token}`);
        setIsValidToken(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired password reset link. Please request a new one.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. The link may have expired.');
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
                <KeyRound size={24} color="#ff3366" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Set New Password
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                Create a strong new password for your Connectly account.
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: '1.5rem' }}>
                <FormError message={error} />
              </div>
            )}

            {isVerifying ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="btn-spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Verifying reset token...</p>
              </div>
            ) : isSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ marginBottom: '1rem', color: '#10b981', display: 'flex', justifyContent: 'center' }}>
                  <CheckCircle size={48} />
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Password Updated!</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Your password has been reset successfully. Redirecting you to login...
                </p>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" fullWidth>
                    Proceed to Login Now <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                  </Button>
                </Link>
              </div>
            ) : !isValidToken ? (
              <div style={{ textAlign: 'center' }}>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" fullWidth>
                    Request a New Reset Link
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <FormField id="new-password" label="New Password" required>
                    <PasswordInput
                      id="new-password"
                      name="newPassword"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      disabled={isSubmitting}
                      required
                    />
                  </FormField>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <FormField id="confirm-password" label="Confirm New Password" required>
                    <PasswordInput
                      id="confirm-password"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your password"
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
                    'Saving Password...'
                  ) : (
                    <>
                      <Lock size={18} style={{ marginRight: '8px' }} /> Update Password
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
                    }}
                  >
                    Cancel and Return to Sign In
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

export default ResetPasswordPage;
