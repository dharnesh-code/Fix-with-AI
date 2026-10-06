import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '🔍', title: 'AI Diagnosis', desc: 'Upload a photo and get an instant expert-level diagnosis of your home repair problem.' },
  { icon: '🛡️', title: 'Evaluator Agent', desc: 'A second AI audits every diagnosis for safety issues, hallucinations, and dangerous advice.' },
  { icon: '🗺️', title: 'Repair Flowchart', desc: 'Interactive step-by-step repair flowchart generated specifically for your problem.' },
  { icon: '💬', title: 'Ask Follow-ups', desc: 'Chat with the AI about your repair after diagnosis — all answers grounded in your specific issue.' },
  { icon: '📋', title: 'Tools Checklist', desc: 'Every tool and material you need, in a checkable list so nothing gets forgotten.' },
  { icon: '📂', title: 'History', desc: 'All your past diagnoses saved to your account — access them anytime, from anywhere.' },
];

const CATEGORIES = ['🚰 Plumbing', '🪚 Carpentry', '⚡ Electronics & Appliances', '🔧 DIY Repairs'];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">FWA</span>
          <span className="brand-name">Fix With AI</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {user.name}
              </span>
              <button className="btn-ghost" onClick={() => navigate('/diagnose')}>Go to App</button>
              <button className="btn-ghost" onClick={() => navigate('/history')}>History</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => navigate('/login')}>Login</button>
              <button className="btn-primary" onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="hero" style={{ marginBottom: 56 }}>
        <div className="hero-eyebrow">AI Powered Home Repair Assistant</div>
        <h1 className="hero-title">
          Diagnose any<br />
          home problem<br />
          <span style={{ color: 'var(--accent)' }}>in seconds.</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '52ch', lineHeight: 1.7, margin: '16px 0 28px', fontSize: 15 }}>
          Upload a photo, describe the issue. Our dual-AI system diagnoses the problem,
          verifies the result for safety, then gives you tools, precautions, and a step-by-step repair plan.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}
            onClick={() => navigate(user ? '/diagnose' : '/register')}>
            {user ? '🚀 Go to App' : '🚀 Get Started Free'}
          </button>
          {!user && (
            <button className="btn-ghost" style={{ fontSize: 13, padding: '13px 20px' }}
              onClick={() => navigate('/login')}>
              Already have an account
            </button>
          )}
        </div>
        <div className="category-strip" style={{ marginTop: 28 }}>
          {CATEGORIES.map(c => (
            <span key={c} className="category-chip">{c}</span>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>
          What you get
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="blueprint-frame" style={{ padding: '22px 20px' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      {!user && (
        <section style={{ textAlign: 'center', marginTop: 64, padding: '48px 24px' }} className="blueprint-frame">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Ready to fix it?</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Start diagnosing for free</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>No credit card required. Free tier available.</div>
          <button className="btn-primary" style={{ fontSize: 15, padding: '13px 32px' }} onClick={() => navigate('/register')}>
            Create Free Account
          </button>
        </section>
      )}

      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid var(--line-strong)', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
          FIX WITH AI — AI POWERED HOME REPAIR
        </span>
      </footer>
    </div>
  );
}
