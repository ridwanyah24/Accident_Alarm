import React, { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign-in failed. Check your details and try again.');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-notice">
        <span className="disclaimer-tag">Emergency Advisory</span>
        <span>For life-threatening emergencies, contact your verified local emergency service directly.</span>
      </div>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-mark" aria-hidden="true">AA</div>
        <p className="auth-eyebrow">ACCIDENTALARM OPERATIONS</p>
        <h1 id="login-title">Staff sign in</h1>
        <p className="auth-description">Use your approved agency account to access incident operations.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-email">Work email</label>
            <input
              id="staff-email"
              className="form-control"
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-password">Password</label>
            <input
              id="staff-password"
              className="form-control"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
};