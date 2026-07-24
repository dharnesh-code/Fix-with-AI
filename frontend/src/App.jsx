import { useState } from "react";
import UploadPanel from "./components/UploadPanel";
import DiagnosisCard from "./components/DiagnosisCard";
import PrecautionsBanner from "./components/PrecautionsBanner";
import StepGuide from "./components/StepGuide";
import ToolsChecklist from "./components/ToolsChecklist";
import FlowchartView from "./components/FlowchartView";
import ChatWindow from "./components/ChatWindow";
import { diagnoseIssue } from "./api";

const TABS = ["Guide", "Flowchart", "Tools", "Ask a follow-up"];

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | loading | done
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { session_id, diagnosis }
  const [activeTab, setActiveTab] = useState("Guide");

  async function handleSubmit(file, description) {
    setStatus("loading");
    setError("");
    try {
      const data = await diagnoseIssue(file, description);
      setResult(data);
      setStatus("done");
      setActiveTab("Guide");
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  function reset() {
    setResult(null);
    setStatus("idle");
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">FWA</span>
          <span className="brand-name">Fix With AI</span>
        </div>
        <span className="header-tagline">DIAGNOSE · REPAIR · VERIFY</span>
      </header>

      {status !== "done" && (
        <section className="hero">

  <div className="hero-eyebrow">
    AI Powered Home Repair Assistant
  </div>

  <h1 className="hero-title">
    Upload the problem.
    <br />
    Get a guided <span>AI repair.</span>
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

      {status === "idle" && <UploadPanel onSubmit={handleSubmit} error={error} />}

      {status === "loading" && (
        <div className="blueprint-frame loading-panel">
          <div className="loading-glyph">ANALYZING SCHEMATIC…</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Reading the photo and description, and drafting a repair plan.
          </div>
          <div className="loading-bar" />
        </div>
      )}

      {status === "done" && result && (
        <>
          <DiagnosisCard diagnosis={result.diagnosis} />
          <PrecautionsBanner diagnosis={result.diagnosis} />

          <div className="tab-bar">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Guide" && (
            <div className="blueprint-frame panel">
              <div className="section-title">Step-by-step repair guide</div>
              <StepGuide steps={result.diagnosis.steps} />
            </div>
          )}

          {activeTab === "Flowchart" && <FlowchartView flowchart={result.diagnosis.flowchart} />}

          {activeTab === "Tools" && (
            <div className="blueprint-frame panel">
              <div className="section-title">Tools &amp; materials needed</div>
              <ToolsChecklist tools={result.diagnosis.tools_and_materials} />
            </div>
          )}

          {activeTab === "Ask a follow-up" && <ChatWindow sessionId={result.session_id} />}

          <div style={{ marginTop: 24 }}>
            <button className="btn-ghost" onClick={reset}>
              ↺ Diagnose a different problem
            </button>
          </div>
        </>
      )}
    </div>
  );
}
