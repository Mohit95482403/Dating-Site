import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Container from '../components/common/Container';
import Button from '../components/common/Button';
import FormField from '../components/auth/FormField';
import PasswordInput from '../components/auth/PasswordInput';
import FormError from '../components/auth/FormError';
import type { ApiError } from '../types/auth';
import { Heart, Sparkles, Shield, ArrowRight } from 'lucide-react';
import './AuthPages.css';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Determine post-login redirect path
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // Navigate to onboarding if profile incomplete, otherwise to requested route/dashboard
      if (!loggedInUser.isProfileComplete) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFormError(apiErr.message || 'Email or password is incorrect. Please try again.');
      if (apiErr.fieldErrors) {
        setFieldErrors(apiErr.fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <Container>
        <div className="auth-split-wrapper">
          {/* Visual / Brand Hero Side (Desktop) */}
          <div className="auth-brand-side glass-panel">
            <div className="brand-side-content">
              <div className="brand-logo-pill">
                <Heart size={18} className="heart-pulse-icon" />
                <span>Connectly Social Discovery</span>
              </div>

              <h1 className="brand-hero-title">
                Find People Who <br />
                <span className="brand-gradient-text">Share Your Vibe.</span>
              </h1>

              <p className="brand-hero-desc">
                Log in to discover authentic connections, browse personalized vibe matches, and enjoy encrypted real-time messaging.
              </p>

              <div className="brand-features-list">
                <div className="brand-feature-item">
                  <div className="feature-bullet-icon">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <strong>Mutual Vibe Match Engine</strong>
                    <p>Proprietary social discovery algorithm based on deep compatibility.</p>
                  </div>
                </div>

                <div className="brand-feature-item">
                  <div className="feature-bullet-icon">
                    <Shield size={16} />
                  </div>
                  <div>
                    <strong>Secure & Private</strong>
                    <p>Protected by HTTP-only token rotation and strict verification protocols.</p>
                  </div>
                </div>
              </div>

              <div className="brand-quote-box">
                <p>"Connectly completely changed how I meet real, authentic people."</p>
                <span>— Elena R., Member since 2026</span>
              </div>
            </div>
          </div>

          {/* Login Card Side */}
          <div className="auth-form-side">
            <div className="auth-card glass-panel">
              <div className="auth-header">
                <div className="auth-logo-badge">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
                <h2>Welcome Back</h2>
                <p>Enter your credentials to access your Connectly account</p>
              </div>

              {formError && <FormError message={formError} />}

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                {/* Email Field */}
                <FormField
                  id="login-email"
                  label="Email Address"
                  required
                  error={fieldErrors.email}
                >
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="name@example.com"
                    required
                    className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
                    disabled={isSubmitting}
                  />
                </FormField>

                {/* Password Field */}
                <FormField
                  id="login-password"
                  label="Password"
                  required
                  error={fieldErrors.password}
                >
                  <PasswordInput
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    placeholder="Enter your password"
                    required
                    error={fieldErrors.password}
                    disabled={isSubmitting}
                  />
                </FormField>

                {/* Auxiliary Controls */}
                <div className="auth-aux-row">
                  <label className="checkbox-label" htmlFor="remember-me">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span>Remember my session</span>
                  </label>

                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-submit-btn"
                >
                  {isSubmitting ? (
                    <span className="btn-loading-content">
                      <span className="btn-spinner"></span>
                      Signing In...
                    </span>
                  ) : (
                    <span className="btn-label-icon">
                      Continue with Account <ArrowRight size={18} />
                    </span>
                  )}
                </Button>
              </form>

              <div className="auth-footer">
                Don't have a Connectly account?{' '}
                <Link to="/register" className="auth-accent-link">
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default LoginPage;
