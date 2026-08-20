/**
 * Supplier Registration Step Indicator — clear 2-step progress.
 * Each step's label sits directly under its own circle (not one
 * floating label for the group). Active step = SAVO gold; a fully
 * completed step (you're now past it) = SAVO emerald; upcoming = muted.
 * Reused as a static per-page snapshot across the two REAL, separate
 * routes (/supplier/register and /supplier/register/profile) rather
 * than shared client state, since they're genuinely different pages
 * in the real flow — not a different flow, just the real 2-step flow
 * visualized.
 */
export function SupplierStepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  const steps = [
    { n: 1 as const, label: "Account Details" },
    { n: 2 as const, label: "Company Profile" },
  ];
  return (
    <div className="savo-supplier-steps">
      {steps.map((s, i) => {
        const isDone = currentStep > s.n;
        const isActive = currentStep === s.n;
        return (
          <div key={s.n} className="savo-supplier-steps-item">
            <div className="savo-supplier-steps-col">
              <span className={`savo-supplier-steps-dot ${isDone ? "is-done" : isActive ? "is-active" : ""}`}>
                {isDone ? "✓" : s.n}
              </span>
              <span className={`savo-supplier-steps-item-label ${isActive ? "is-active" : ""}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className={`savo-supplier-steps-line ${isDone ? "is-active" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}
