import { useState } from "react";

export default function DiagnosisCard({ diagnosis }) {
  const risk = (diagnosis.risk_level || "low").toLowerCase();
  const [voiceLang, setVoiceLang] = useState("en-US");

  function speakDiagnosis() {
    if (!window.speechSynthesis) {
      alert("Your browser does not support Text-to-Speech.");
      return;
    }

    let text = "";
    if (voiceLang === "ta-IN") {
      text = `
      பிரச்சனை: ${diagnosis.problem_identified}.
      வகை: ${diagnosis.category}.
      மதிப்பிடப்பட்ட நேரம்: ${diagnosis.estimated_time}.
      அபாய நிலை: ${diagnosis.risk_level}.
      ${
        diagnosis.professional_help_required
          ? "நிபுணரின் உதவி பரிந்துரைக்கப்படுகிறது."
          : "இதை நீங்களே பாதுகாப்பாக சரிசெய்யலாம்."
      }
      `;
    } else {
      text = `
      Problem identified: ${diagnosis.problem_identified}.
      Category: ${diagnosis.category}.
      Estimated repair time: ${diagnosis.estimated_time}.
      Risk level: ${diagnosis.risk_level}.
      ${
        diagnosis.professional_help_required
          ? "Professional assistance is recommended."
          : "This repair can be performed safely as a DIY task."
      }
      `;
    }

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = voiceLang;
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    // Explicitly try to find a matching voice (especially important for Tamil)
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (voiceLang === "ta-IN") {
      selectedVoice = voices.find((v) => v.lang.includes("ta") || v.name.toLowerCase().includes("tamil"));
    } else {
      selectedVoice = voices.find((v) => v.lang.includes("en"));
    }

    if (selectedVoice) {
      speech.voice = selectedVoice;
    } else if (voiceLang === "ta-IN") {
      alert("Tamil voice not found! Please ensure your browser or Windows OS has the Tamil Speech Language Pack installed.");
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
  }

  return (
    <div className="blueprint-frame diagnosis-card">
      <div className="diagnosis-top">
        <div>
          <div className="diagnosis-category">
            {diagnosis.category}
          </div>

          <div className="diagnosis-problem">
            {diagnosis.problem_identified}
          </div>
        </div>

        <div className="risk-gauge">
          <span className={`risk-badge ${risk}`}>
            {risk} risk
          </span>
        </div>
      </div>

      <div className="diagnosis-meta">
        <div className="meta-item">
          Estimated Time
          <strong>{diagnosis.estimated_time}</strong>
        </div>

        <div className="meta-item">
          Professional Needed
          <strong>
            {diagnosis.professional_help_required
              ? "Yes"
              : "No — DIY Safe"}
          </strong>
        </div>

        <div className="meta-item">
          Category
          <strong style={{ textTransform: "capitalize" }}>
            {diagnosis.category}
          </strong>
        </div>
      </div>

      {diagnosis.confidence_note && (
        <div className="confidence-note">
          <strong>Note:</strong> {diagnosis.confidence_note}
        </div>
      )}

      <div
        style={{
          marginTop: "25px",
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={voiceLang}
          onChange={(e) => setVoiceLang(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--bg-input)",
            border: "1px solid var(--line-strong)",
            color: "var(--text-primary)",
            borderRadius: "var(--radius)",
            fontSize: "14px",
            height: "42px",
          }}
        >
          <option value="en-US">English Voice</option>
          <option value="ta-IN">தமிழ் (Tamil) Voice</option>
        </select>

        <button
          className="btn-primary"
          onClick={speakDiagnosis}
        >
          🔊 Listen
        </button>

        <button
          className="btn-ghost"
          onClick={stopSpeaking}
        >
          ⏹ Stop
        </button>
      </div>
    </div>
  );
}