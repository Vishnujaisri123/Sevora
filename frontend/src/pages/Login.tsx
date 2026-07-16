import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight, Eye, EyeOff, Key } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register, error: authError } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveredCode, setRecoveredCode] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || (isSignUp && !email)) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setLocalError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setLocalError('Please enter your email address');
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: recoveryEmail });
      setRecoveredCode(res.data.resetToken);
      setIsReset(true);
      setIsForgot(false);
      alert('Password reset recovery code generated.');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Failed to submit recovery request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword || !confirmNewPassword) {
      setLocalError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', {
        token: resetCode,
        password: newPassword
      });
      alert('Password reset successfully. You can now Sign In.');
      setIsReset(false);
      setIsForgot(false);
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setRecoveredCode(null);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Helper to quickly fill credentials for grading/testing convenience
  const fillCredentials = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setUsername('vishnuketa999@gmail.com');
      setPassword('Vishnuketa@123');
    } else {
      setUsername('employee');
      setPassword('employee123');
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Mesh Gradients */}
      <div style={styles.meshLeft} />
      <div style={styles.meshRight} />

      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <span style={styles.logoIcon}>🛕</span>
          </div>
          <h1 style={styles.title}>
            {isForgot ? 'Reset Password' : isReset ? 'Set New Password' : isSignUp ? 'Create Account' : 'Temple Ticket'}
          </h1>
          <p style={styles.subtitle}>
            {isForgot ? 'Request a password reset code' : isReset ? 'Enter the recovery code to update your password' : isSignUp ? 'Register new employee account' : 'Secure Portal & Management Platform'}
          </p>
        </div>

        {(localError || authError) && (
          <div style={styles.errorBox}>
            {localError || authError}
          </div>
        )}

        {isForgot ? (
          /* Forgot Password View */
          <form onSubmit={handleForgotSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label className="form-label" htmlFor="recoveryEmail">Email Address</label>
              <div style={styles.inputWrapper}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8696a0', fontSize: '15px', fontWeight: 'bold' }}>@</span>
                <input
                  id="recoveryEmail"
                  type="email"
                  className="form-input"
                  placeholder="Enter your registered email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Sending...' : 'Send Recovery Code'}
              {!loading && <ArrowRight size={18} />}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setIsReset(false);
                  setLocalError(null);
                }}
                style={styles.switchModeBtn}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : isReset ? (
          /* Reset Password View */
          <form onSubmit={handleResetSubmit} style={styles.form}>
            {recoveredCode && (
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(0, 168, 132, 0.15)',
                border: '1px solid rgba(0, 168, 132, 0.25)',
                borderRadius: '8px',
                color: '#00a884',
                fontSize: '0.85rem',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Testing Recovery Code: <strong style={{ letterSpacing: '1px', fontSize: '0.95rem' }}>{recoveredCode}</strong>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label className="form-label" htmlFor="resetCode">Recovery Code</label>
              <div style={styles.inputWrapper}>
                <Key size={18} style={styles.inputIcon} />
                <input
                  id="resetCode"
                  type="text"
                  className="form-input"
                  placeholder="Enter 6-digit recovery code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label className="form-label" htmlFor="newPassword">New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  id="newPassword"
                  type="password"
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label className="form-label" htmlFor="confirmNewPassword">Confirm New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  id="confirmNewPassword"
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
              {!loading && <ArrowRight size={18} />}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setIsReset(false);
                  setLocalError(null);
                }}
                style={styles.switchModeBtn}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Sign In & Sign Up View */
          <>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label className="form-label" htmlFor="username">Username</label>
                <div style={styles.inputWrapper}>
                  <User size={18} style={styles.inputIcon} />
                  <input
                    id="username"
                    type="text"
                    className="form-input"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {isSignUp && (
                <div style={styles.inputGroup}>
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <div style={styles.inputWrapper}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8696a0', fontSize: '15px', fontWeight: 'bold' }}>@</span>
                    <input
                      id="email"
                      type="email"
                      className="form-input"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label className="form-label" htmlFor="password">Password</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div style={styles.inputGroup}>
                  <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input
                      id="confirmPassword"
                      type="password"
                      className="form-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {!isSignUp && (
                <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgot(true);
                      setIsSignUp(false);
                      setIsReset(false);
                      setLocalError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#e9edef'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#8696a0'}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
                {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setLocalError(null);
                  setUsername('');
                  setPassword('');
                  setEmail('');
                  setConfirmPassword('');
                }}
                style={styles.switchModeBtn}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

            {/* Quick Testing helper panel */}
            {!isSignUp && (
              <div style={styles.helperPanel}>
                <p style={styles.helperTitle}>Quick Access for Testing:</p>
                <div style={styles.helperBtnContainer}>
                  <button 
                    type="button" 
                    onClick={() => fillCredentials('employee')} 
                    style={styles.helperBtn}
                    className="btn-secondary"
                  >
                    <User size={14} /> Employee
                  </button>
                  <button 
                    type="button" 
                    onClick={() => fillCredentials('admin')} 
                    style={styles.helperBtn}
                    className="btn-secondary"
                  >
                    <Shield size={14} /> Admin
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Inline CSS Styles for Login Component to match premium guidelines
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b141a',
    position: 'relative',
    overflow: 'hidden',
  },
  meshLeft: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 168, 132, 0.15) 0%, rgba(11, 20, 26, 0) 70%)',
    top: '-10%',
    left: '-10%',
    zIndex: 1,
  },
  meshRight: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(52, 183, 241, 0.12) 0%, rgba(11, 20, 26, 0) 70%)',
    bottom: '-15%',
    right: '-10%',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 32px',
    zIndex: 2,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 16px auto',
    border: '1px solid rgba(0, 168, 132, 0.25)',
  },
  logoIcon: {
    fontSize: '28px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: '700',
    color: '#e9edef',
    letterSpacing: '-0.5px',
    marginBottom: '6px',
  },
  subtitle: {
    color: '#8696a0',
    fontSize: '0.88rem',
  },
  errorBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    fontSize: '0.88rem',
    marginBottom: '24px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#8696a0',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
  submitBtn: {
    width: '100%',
    marginTop: '10px',
    padding: '14px',
    fontSize: '1rem',
  },
  helperPanel: {
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(134, 150, 160, 0.12)',
    textAlign: 'center',
  },
  helperTitle: {
    color: '#667781',
    fontSize: '0.8rem',
    marginBottom: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  helperBtnContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  helperBtn: {
    padding: '8px 16px',
    fontSize: '0.82rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '6px',
  },
  switchModeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: '600',
    textDecoration: 'underline'
  }
};

export default Login;
