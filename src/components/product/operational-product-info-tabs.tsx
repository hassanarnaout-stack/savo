type Fact = { label: string; value: string };

/**
 * V22 Product Information — Description + Product Details balanced
 * side by side (no more EN+AR shown together, no more tabs). Empty-
 * state rules per the approved spec: description-only, details-only,
 * both, or neither (section hidden entirely) are all real cases —
 * verify by testing an actual product missing one or the other.
 */
export function OperationalProductInfoTabs({
  description,
  hasDetails,
  detailsSlot,
}: {
  description: string | null;
  hasDetails: boolean;
  detailsSlot: Fact[];
}) {
  const hasDescription = !!description?.trim();
  if (!hasDescription && !hasDetails) return null;

  return (
    <section className="savo-pdp-info" id="product-information">
      <header className="savo-pdp-section-head">
        <p className="savo-products-eyebrow">PRODUCT INFORMATION</p>
        <h2 className="savo-pdp-section-title">Everything you need to know.</h2>
      </header>
      <div className={`savo-pdp-info-grid${!hasDescription || !hasDetails ? " is-single" : ""}`}>
        {hasDescription && (
          <div className="savo-pdp-info-desc">
            <p>{description}</p>
          </div>
        )}
        {hasDetails && (
          <dl className="savo-pdp-facts">
            {detailsSlot.map((fact) => (
              <div key={`${fact.label}-${fact.value}`}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
