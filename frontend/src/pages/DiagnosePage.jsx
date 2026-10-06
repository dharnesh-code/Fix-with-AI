import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UploadPanel from '../components/UploadPanel';
import DiagnosisCard from '../components/DiagnosisCard';
import PrecautionsBanner from '../components/PrecautionsBanner';
import StepGuide from '../components/StepGuide';
import ToolsChecklist from '../components/ToolsChecklist';
import FlowchartView from '../components/FlowchartView';
import ChatWindow from '../components/ChatWindow';
import { diagnoseIssue } from '../api';

const TABS = ['Guide', 'Flowchart', 'Tools', 'Resources', 'Ask a follow-up'];

const STAGE_MESSAGES = {
  queued:     { label: 'QUEUED',    detail: 'Request received. Waiting to start analysis…' },
  processing: { label: 'ANALYZING', detail: 'Reading the photo and drafting a repair plan…' },
  verifying:  { label: 'VERIFYING', detail: 'Safety evaluator is cross-checking the diagnosis…' },
  done:       { label: 'DONE',      detail: 'Finalising results…' },
};

export default function DiagnosePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [status, setStatus] = useState('idle');
  const [loadingStage, setLoadingStage] = useState('queued');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('Guide');

  async function handleSubmit(file, description) {
    setStatus('loading');
    setLoadingStage('queued');
    setError('');
    try {
      const data = await diagnoseIssue(file, description, (stage) => {
        setLoadingStage(stage === 'processing' ? 'processing' : stage);
      });
      setResult(data);
      setStatus('done');
      setActiveTab('Guide');
    } catch (err) {
      setError(err?.message || err?.response?.data?.detail || 'Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  function reset() {
    setResult(null);
    setStatus('idle');
    setError('');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark">FWA</span>
          <span className="brand-name">Fix With AI</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="header-tagline">DIAGNOSE · REPAIR · VERIFY</span>
          {user ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{user.name}</span>
              <button className="btn-ghost" onClick={() => navigate('/history')}>History</button>
              <button className="btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => navigate('/login')}>Login</button>
              <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </header>

      {status !== 'done' && (
        <section className="hero">
          <div className="hero-eyebrow">AI Powered Home Repair Assistant</div>
          <h1 className="hero-title">
            Upload the problem.<br />
            <span>Get a guided AI repair.</span>
          </h1>
          <p className="hero-description">
            Upload a photo and describe the issue. Our AI analyzes the problem,
            identifies the likely cause, recommends the right tools, provides
            safety precautions, generates a step-by-step repair guide, and creates
            an interactive repair flowchart—all in seconds.
          </p>
          <div className="category-strip">
            <span className="category-chip">🚰 Plumbing</span>
            <span className="category-chip">🪚 Carpentry</span>
            <span className="category-chip">⚡ Electronics & Appliances</span>
            <span className="category-chip">🔧 DIY Repairs</span>
          </div>
        </section>
      )}

      {status === 'idle' && <UploadPanel onSubmit={handleSubmit} error={error} />}

      {status === 'loading' && (() => {
        const stage = STAGE_MESSAGES[loadingStage] || STAGE_MESSAGES.queued;
        return (
          <div className="blueprint-frame loading-panel">
            <div className="loading-glyph">{stage.label}…</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{stage.detail}</div>
            <div className="loading-bar" />
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>
              This may take 15–30 seconds while the AI diagnoses and verifies your issue.
            </div>
          </div>
        );
      })()}

      {status === 'done' && result && (
        <>
          <DiagnosisCard diagnosis={result.diagnosis} />
          <PrecautionsBanner diagnosis={result.diagnosis} />
          <div className="tab-bar">
            {TABS.map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          {activeTab === 'Guide' && (
            <div className="blueprint-frame panel">
              <div className="section-title">Step-by-step repair guide</div>
              <StepGuide steps={result.diagnosis.steps} />
            </div>
          )}
          {activeTab === 'Flowchart' && <FlowchartView flowchart={result.diagnosis.flowchart} />}
          {activeTab === 'Tools' && (
            <div className="blueprint-frame panel">
              <div className="section-title">Tools & materials needed</div>
              <ToolsChecklist tools={result.diagnosis.tools_and_materials} />
            </div>
          )}
          {activeTab === 'Resources' && (
            <div className="blueprint-frame panel">
              <div className="section-title">Helpful Tutorials & Guides</div>
              {result.diagnosis.resources && result.diagnosis.resources.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.diagnosis.resources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noreferrer" 
                       style={{ display: 'block', padding: '12px 16px', background: 'var(--bg-input)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{new URL(r.url).hostname}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No resources could be fetched at this time (API quota exceeded).</div>
              )}
            </div>
          )}
          {activeTab === 'Ask a follow-up' && <ChatWindow sessionId={result.session_id} />}
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={reset}>↺ Diagnose a different problem</button>
            {user && <button className="btn-ghost" onClick={() => navigate('/history')}>📋 View History</button>}
          </div>
        </>
      )}
    </div>
  );
}
