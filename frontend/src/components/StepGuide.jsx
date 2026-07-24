export default function StepGuide({ steps }) {
  return (
    <ol className="step-guide">
      {steps.map((step) => (
        <li className="step-item" key={step.step_number}>
          <div className="step-number">{String(step.step_number).padStart(2, "0")}</div>
          <div className="step-body">
            <div className="step-title">{step.title}</div>
            <p className="step-detail">{step.detail}</p>
            {step.warning && <div className="step-warning">⚠ {step.warning}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
