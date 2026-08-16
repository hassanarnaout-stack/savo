"use client";

import { useState } from "react";

type Fact = { label: string; value: string };

export function OperationalProductInfoTabs({
  description,
  descriptionAr,
  facts,
}: {
  description: string;
  descriptionAr?: string | null;
  facts: Fact[];
}) {
  const [tab, setTab] = useState<"description" | "specifications">("description");

  return (
    <section className="savo-pdp-info" id="product-information">
      <header className="savo-pdp-section-head"><p className="savo-products-eyebrow">PRODUCT INFORMATION</p><h2 className="savo-pdp-section-title">Everything you need to know.</h2></header>
      <div className="savo-pdp-info-tabs" role="tablist" aria-label="Product information">
        <button role="tab" aria-selected={tab === "description"} onClick={() => setTab("description")}>Description</button>
        {facts.length > 0 && <button role="tab" aria-selected={tab === "specifications"} onClick={() => setTab("specifications")}>Specifications</button>}
      </div>
      {tab === "description" ? (
        <div className="savo-pdp-info-panel savo-pdp-info-desc"><p>{description}</p>{descriptionAr && <p dir="rtl" lang="ar">{descriptionAr}</p>}</div>
      ) : (
        <div className="savo-pdp-info-panel"><dl className="savo-pdp-facts">{facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></div>
      )}
    </section>
  );
}
