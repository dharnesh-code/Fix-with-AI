import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchHistory, deleteHistoryItem } from '../api';
import { useAuth } from '../context/AuthContext';

const RISK_LABEL = { low: 'LOW RISK', medium: 'MED RISK', high: 'HIGH RISK' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchHistory()
      .then(setItems)
      .catch(() => setError('Could not load history.'))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleDelete(id) {
    await deleteHistoryItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (expanded === id) setExpanded(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark">FWA</span>
          <span className="brand-name">Fix With AI</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{user?.name}</span>
          <button className="btn-ghost" onClick={() => navigate('/diagnose')}>New Diagnosis</button>
          <button className="btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
      </header>

      <div style={{ marginBottom: 32 }}>
        <div className="hero-eyebrow">Your diagnoses</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>History</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>{items.length} saved diagnosis{items.length !== 1 ? 'es' : ''}</p>
      </div>

      {loading && (
        <div className="blueprint-frame loading-panel">
          <div className="loading-glyph">LOADING…</div>
          <div className="loading-bar" />
        </div>
      )}

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      {!loading && items.length === 0 && !error && (
        <div className="blueprint-frame" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No diagnoses yet</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>Your completed diagnoses will appear here.</div>
          <button className="btn-primary" onClick={() => navigate('/diagnose')}>Start a Diagnosis</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => {
          const risk = (item.diagnosis.risk_level || 'low').toLowerCase();
          const isOpen = expanded === item.id;
          return (
            <div key={item.id} className="blueprint-frame" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {item.diagnosis.category}
                    </span>
                    <span className={`risk-badge ${risk}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                      {RISK_LABEL[risk] || risk}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                    {item.diagnosis.problem_identified}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
                    {formatDate(item.created_at)} · {item.diagnosis.estimated_time}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }}
                    onClick={() => setExpanded(isOpen ? null : item.id)}>
                    {isOpen ? 'Collapse' : 'View Details'}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: '6px 10px', color: 'var(--risk-high)', borderColor: 'var(--risk-high)' }}
                    onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--line-strong)' }}>
                  {item.description && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="section-title" style={{ marginBottom: 6 }}>Your description</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>{item.description}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <div className="section-title" style={{ marginBottom: 8 }}>Precautions</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.8 }}>
                      {item.diagnosis.precautions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div className="section-title" style={{ marginBottom: 8 }}>Repair steps</div>
                    <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.8 }}>
                      {item.diagnosis.steps.map(s => (
                        <li key={s.step_number} style={{ marginBottom: 6 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{s.title}</strong> — {s.detail}
                        </li>
                      ))}
                    </ol>
                  </div>
                  {item.diagnosis.resources && item.diagnosis.resources.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div className="section-title" style={{ marginBottom: 8 }}>Helpful Resources</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {item.diagnosis.resources.map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noreferrer" 
                             style={{ display: 'block', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{r.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{new URL(r.url).hostname}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
