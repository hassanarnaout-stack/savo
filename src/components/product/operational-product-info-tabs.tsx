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
    <section className="pdp-info-section" id="product-information">
      <header><p>PRODUCT INFORMATION</p><h2>Everything you need to know.</h2></header>
      <div className="pdp-tabs" role="tablist" aria-label="Product information">
        <button role="tab" aria-selected={tab === "description"} onClick={() => setTab("description")}>Description</button>
        {facts.length > 0 && <button role="tab" aria-selected={tab === "specifications"} onClick={() => setTab("specifications")}>Specifications</button>}
      </div>
      {tab === "description" ? (
        <div className="pdp-tab-panel pdp-description"><p>{description}</p>{descriptionAr && <p dir="rtl" lang="ar">{descriptionAr}</p>}</div>
      ) : (
        <div className="pdp-tab-panel"><dl className="pdp-facts">{facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></div>
      )}
    </section>
  );
}
