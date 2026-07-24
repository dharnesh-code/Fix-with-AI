export default function DiagnosisCard({ diagnosis }) {
  const risk = (diagnosis.risk_level || "low").toLowerCase();

  function speakDiagnosis() {
    if (!window.speechSynthesis) {
      alert("Your browser does not support Text-to-Speech.");
      return;
    }

    const text = `
    Problem identified: ${diagnosis.problem_identified}.
    Category: ${diagnosis.category}.
    Estimated repair time: ${diagnosis.estimated_time}.
    Risk level: ${diagnosis.risk_level}.
    ${
      diagnosis.professional_help_required
        ? "Professional assistance is recommended."
        : "This repair can be performed safely as a DIY task."
    }
    ${diagnosis.confidence_note || ""}
    `;

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

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
        }}
      >
        <button
          className="btn-primary"
          onClick={speakDiagnosis}
        >
          🔊 Listen to Diagnosis
        </button>

        <button
          className="btn-ghost"
          onClick={stopSpeaking}
        >
          ⏹ Stop Voice
        </button>
      </div>
    </div>
  );
}