import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      login(data.token, data.user);
      navigate('/diagnose');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <span className="brand-mark">FWA</span>
        <span className="brand-name">Fix With AI</span>
      </div>

      <form className="blueprint-frame auth-card" onSubmit={handleSubmit}>
        <div className="auth-eyebrow">Welcome back</div>
        <h2 className="auth-title">Sign in to your account</h2>

        <div className="auth-field">
          <label className="field-label">Email address</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label className="field-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </div>
      </form>
    </div>
  );
}
