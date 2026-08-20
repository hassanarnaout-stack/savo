/**
 * Supplier Registration Step Indicator — exact V22 Figma visual pattern
 * (gold-filled circle for reached/current steps, connecting line fills
 * gold once the step is complete). Reused as a static per-page snapshot
 * across the two REAL, separate routes (/supplier/register and
 * /supplier/register/profile) rather than shared client state, since
 * they're genuinely different pages in the real flow — not a
 * different flow, just the real 2-step flow visualized.
 */
export function SupplierStepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  const steps = [
    { n: 1 as const, label: "Account Details" },
    { n: 2 as const, label: "Company Profile" },
  ];
  return (
    <div className="savo-supplier-steps">
      {steps.map((s, i) => (
        <div key={s.n} className="savo-supplier-steps-item">
          <div className="savo-supplier-steps-row">
            <span className={`savo-supplier-steps-dot ${currentStep >= s.n ? "is-active" : ""}`}>{s.n}</span>
            {i < steps.length - 1 && <span className={`savo-supplier-steps-line ${currentStep > s.n ? "is-active" : ""}`} />}
          </div>
        </div>
      ))}
      <span className="savo-supplier-steps-label">{steps.find((s) => s.n === currentStep)?.label}</span>
    </div>
  );
}
