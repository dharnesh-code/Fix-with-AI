import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const data = await registerUser(name, email, password);
      login(data.token, data.user);
      navigate('/diagnose');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.');
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
        <div className="auth-eyebrow">Get started</div>
        <h2 className="auth-title">Create your account</h2>

        <div className="auth-field">
          <label className="field-label">Full name</label>
          <input className="auth-input" type="text" placeholder="Jane Smith"
            value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>

        <div className="auth-field">
          <label className="field-label">Email address</label>
          <input className="auth-input" type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="auth-field">
          <label className="field-label">Password <span style={{color:'var(--text-faint)',fontWeight:400}}>(min. 6 characters)</span></label>
          <input className="auth-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
