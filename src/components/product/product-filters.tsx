"use client";

/**
 * ProductFilters — /products page, V22-ported filter UI.
 * ============================================================
 * Ported from savo-new/src/App.tsx AllProducts(). ONE filter system:
 * desktop sidebar and mobile drawer render the same groups and write
 * the same URL params (see src/lib/product-filters.ts for the typed
 * contract) — no separate mobile filter state.
 *
 * Two structural adaptations from the literal V22 source (documented,
 * not silent):
 * 1. V22's sidebar repeats a "Category" checkbox group alongside the
 *    top category strip. Production has one category filter param;
 *    duplicating it as a second control would be a duplicate filter
 *    system. The sidebar covers Brand / Price / Deals / Availability;
 *    the top strip remains the single category control.
 * 2. V22's fixed 4-bucket price UI is preserved, but each bucket sets
 *    real `minPrice`/`maxPrice` query params (not an opaque bucket
 *    key) — a cleaner, more extensible contract for handoff.
 */
import { useState } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import type { DealKey, AvailabilityKey, SortKey } from "@/lib/product-filters";

interface Category { id: string; name: string; nameAr?: string | null; slug: string }

const SORT_OPTIONS: { id: SortKey; label: string; ar: string }[] = [
  { id: "newest", label: "Newest", ar: "الأحدث" },
  { id: "price_asc", label: "Price: Low → High", ar: "السعر: من الأقل" },
  { id: "price_desc", label: "Price: High → Low", ar: "السعر: من الأعلى" },
  { id: "discount", label: "Biggest Discount", ar: "أكبر خصم" },
  { id: "popular", label: "Popular", ar: "الأكثر شعبية" },
];

const DEAL_OPTIONS: { id: DealKey; label: string; ar: string }[] = [
  { id: "savo", label: "SAVO Deals", ar: "عروض سافو" },
  { id: "discount20", label: "20%+ Off", ar: "خصم 20%+" },
  { id: "rescue", label: "Rescue Deals", ar: "عروض الإنقاذ" },
];

const PRICE_BUCKETS: { key: string; min?: number; max?: number; label: string; ar: string }[] = [
  { key: "under10", max: 10, label: "Under KD 10", ar: "أقل من 10 د.ك" },
  { key: "10-50", min: 10, max: 50, label: "KD 10–50", ar: "10–50 د.ك" },
  { key: "50-150", min: 50, max: 150, label: "KD 50–150", ar: "50–150 د.ك" },
  { key: "over150", min: 150, label: "Over KD 150", ar: "أكثر من 150 د.ك" },
];

const AVAILABILITY_OPTIONS: { id: AvailabilityKey; label: string; ar: string }[] = [
  { id: "in_stock", label: "In Stock", ar: "متاح" },
  { id: "low_stock", label: "Low Stock", ar: "نفاد قريباً" },
];

/**
 * Navigation contexts vs combinable refinements.
 * ============================================================
 * `type` (Product.type=DEAL/RESCUE), `filter` (flash/ending_soon), and
 * `badge` are the three "primary entry context" params the Deals
 * dropdown links write — each represents a distinct top-level view,
 * not a refinement of the current one. Every OTHER param (brand,
 * price, deal checkboxes, availability, sort, q) is a combinable
 * refinement that stays valid across a category change.
 *
 * Root cause of the reported bug: setParam()/clearAll() always
 * inherited the ENTIRE current query string via
 * `new URLSearchParams(searchParams.toString())` with no concept of
 * "this param belongs to a different, now-abandoned context" — so
 * clicking a category chip while on Flash Deals produced
 * ?type=DEAL&category=mystery-boxes (0 real products ever satisfy
 * both). Centralized fix: selecting a new category clears these three
 * context params; Clear All clears them too.
 */
const CONTEXT_PARAMS = ["type", "filter", "badge"];

export function ProductFilters({
  categories, brands, activeCategory, activeSort,
  selectedBrands, selectedDeals, minPrice, maxPrice, selectedAvailability,
  isArabic, children,
}: {
  categories: Category[]; brands: string[]; activeCategory?: string; activeSort: SortKey;
  selectedBrands: string[]; selectedDeals: DealKey[]; minPrice?: number; maxPrice?: number; selectedAvailability?: AvailabilityKey;
  isArabic: boolean; children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activePriceBucket = PRICE_BUCKETS.find((b) => (b.min ?? 0) === (minPrice ?? 0) && (b.max ?? undefined) === maxPrice)?.key;

  function push(next: URLSearchParams) {
    next.delete("page"); // any filter/sort change resets pagination
    router.push(`${pathname}?${next.toString()}`);
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Selecting a category is a new primary navigation context — a
    // stale Deals-context param from wherever the user came from must
    // not silently survive into it (see CONTEXT_PARAMS above).
    if (key === "category") CONTEXT_PARAMS.forEach((p) => next.delete(p));
    push(next);
  }

  function toggleListParam(key: string, current: string[], value: string) {
    const set = new Set(current);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = new URLSearchParams(searchParams.toString());
    if (set.size) next.set(key, [...set].join(","));
    else next.delete(key);
    push(next);
  }

  function setPriceBucket(bucketKey: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (activePriceBucket === bucketKey) {
      next.delete("minPrice");
      next.delete("maxPrice");
    } else {
      const bucket = PRICE_BUCKETS.find((b) => b.key === bucketKey)!;
      if (bucket.min != null) next.set("minPrice", String(bucket.min)); else next.delete("minPrice");
      if (bucket.max != null) next.set("maxPrice", String(bucket.max)); else next.delete("maxPrice");
    }
    push(next);
  }

  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [
    ...selectedBrands.map((b) => ({ key: "brand:" + b, label: b, onRemove: () => toggleListParam("brand", selectedBrands, b) })),
    ...(activePriceBucket
      ? [{ key: "price", label: isArabic ? PRICE_BUCKETS.find((b) => b.key === activePriceBucket)!.ar : PRICE_BUCKETS.find((b) => b.key === activePriceBucket)!.label, onRemove: () => setPriceBucket(activePriceBucket) }]
      : []),
    ...selectedDeals.map((d) => {
      const opt = DEAL_OPTIONS.find((o) => o.id === d)!;
      return { key: "deal:" + d, label: isArabic ? opt.ar : opt.label, onRemove: () => toggleListParam("deal", selectedDeals, d) };
    }),
    ...(selectedAvailability
      ? [{ key: "avail", label: isArabic ? AVAILABILITY_OPTIONS.find((o) => o.id === selectedAvailability)!.ar : AVAILABILITY_OPTIONS.find((o) => o.id === selectedAvailability)!.label, onRemove: () => setParam("availability", "") }]
      : []),
  ];

  function clearAll() {
    const next = new URLSearchParams(searchParams.toString());
    ["brand", "minPrice", "maxPrice", "deal", "availability", "page", ...CONTEXT_PARAMS, "category", "q"].forEach((k) => next.delete(k));
    router.push(`${pathname}?${next.toString()}`);
  }

  const FilterGroups = () => (
    <>
      <FilterGroup title={isArabic ? "العلامة التجارية" : "Brand"}>
        {brands.map((b) => (
          <FilterCheckbox key={b} checked={selectedBrands.includes(b)} label={b} onChange={() => toggleListParam("brand", selectedBrands, b)} />
        ))}
      </FilterGroup>
      <FilterGroup title={isArabic ? "السعر" : "Price"}>
        {PRICE_BUCKETS.map((b) => (
          <FilterCheckbox key={b.key} checked={activePriceBucket === b.key} label={isArabic ? b.ar : b.label} onChange={() => setPriceBucket(b.key)} />
        ))}
      </FilterGroup>
      <FilterGroup title={isArabic ? "العروض" : "Deals"}>
        {DEAL_OPTIONS.map((o) => (
          <FilterCheckbox key={o.id} checked={selectedDeals.includes(o.id)} label={isArabic ? o.ar : o.label} onChange={() => toggleListParam("deal", selectedDeals, o.id)} />
        ))}
      </FilterGroup>
      <FilterGroup title={isArabic ? "التوفر" : "Availability"}>
        {AVAILABILITY_OPTIONS.map((o) => (
          <FilterCheckbox key={o.id} checked={selectedAvailability === o.id} label={isArabic ? o.ar : o.label} onChange={() => setParam("availability", selectedAvailability === o.id ? "" : o.id)} />
        ))}
      </FilterGroup>
    </>
  );

  return (
    <>
      {/* Category strip — the single category control (see file header) */}
      <div className="savo-products-catstrip">
        <button onClick={() => setParam("category", "")} className={"savo-products-catpill" + (!activeCategory ? " is-active" : "")}>
          {isArabic ? "الكل" : "All"}
        </button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setParam("category", cat.slug)} className={"savo-products-catpill" + (activeCategory === cat.slug ? " is-active" : "")}>
            {isArabic && cat.nameAr ? cat.nameAr : cat.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="savo-products-toolbar">
        <select value={activeSort} onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)} className="savo-products-sort">
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{isArabic ? o.ar : o.label}</option>
          ))}
        </select>

        <button onClick={() => setDrawerOpen(true)} className="savo-products-filter-toggle">
          {isArabic ? "الفلاتر" : "Filters"} {activeFilterChips.length > 0 ? `(${activeFilterChips.length})` : ""}
        </button>

        <div className="savo-products-chips">
          {activeFilterChips.map((chip) => (
            <button key={chip.key} onClick={chip.onRemove} className="savo-products-chip">
              {chip.label} <span>×</span>
            </button>
          ))}
          {activeFilterChips.length > 0 && (
            <button onClick={clearAll} className="savo-products-clear">{isArabic ? "مسح الفلاتر" : "Clear all"}</button>
          )}
        </div>
      </div>

      <div className="savo-products-main">
        <aside className="savo-products-sidebar">
          <div className="savo-products-sidebar-title">{isArabic ? "الفلاتر" : "Filters"}</div>
          <FilterGroups />
        </aside>

        <div className="savo-products-content">{children}</div>
      </div>

      {drawerOpen && (
        <div className="savo-products-drawer">
          <div className="savo-products-drawer-scrim" onClick={() => setDrawerOpen(false)} />
          <div className="savo-products-drawer-panel">
            <div className="savo-products-drawer-head">
              <span>{isArabic ? "الفلاتر" : "Filters"}</span>
              <button onClick={() => setDrawerOpen(false)}>×</button>
            </div>
            <FilterGroups />
            <button onClick={() => setDrawerOpen(false)} className="savo-products-drawer-apply">
              {isArabic ? "تطبيق الفلاتر" : "Apply Filters"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="savo-products-filter-group">
      <div className="savo-products-filter-group-title">{title}</div>
      <div className="savo-products-filter-group-items">{children}</div>
    </div>
  );
}

function FilterCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="savo-products-checkbox">
      <span className={"savo-products-checkbox-box" + (checked ? " is-checked" : "")}>{checked && "✓"}</span>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}
