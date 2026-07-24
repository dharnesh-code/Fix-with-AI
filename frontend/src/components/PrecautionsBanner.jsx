export default function PrecautionsBanner({ diagnosis }) {
  const risk = (diagnosis.risk_level || "low").toLowerCase();

  return (
    <div className={`precautions-banner ${risk}`}>
      <div className="precautions-title">Precautions &amp; risk measures</div>
      <ul className="precautions-list">
        {diagnosis.precautions.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      {diagnosis.professional_help_required && (
        <div className="pro-required">
          ⚠ This issue requires a licensed professional — the steps below cover safety actions only.
        </div>
      )}
    </div>
  );
}
