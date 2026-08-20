import type { ReactNode } from "react";
import { SAVOLogo } from "@/components/brand/savo-master-logo";
import { SupplierPendingLogout } from "@/components/supplier/supplier-pending-logout";

/**
 * SupplierStatusPage — shared VISUAL shell for the non-operational
 * Supplier Status family (/supplier/pending, /supplier/rejected,
 * /supplier/suspended). Purely presentational: it accepts already-
 * resolved content and renders the approved dark card composition.
 * All gate/auth logic (getSupplierAccountGate, redirects) stays
 * explicit in each server page component — this component never sees
 * or makes access decisions.
 */
export function SupplierStatusPage({
  icon,
  title,
  message,
  detail,
  contactEmail,
  accent = "gold",
}: {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  detail?: { label: string; value: string };
  contactEmail?: string;
  accent?: "gold" | "red" | "amber";
}) {
  return (
    <div className="savo-supplier-onboard-page savo-supplier-status-page">
      <div className="savo-supplier-onboard-glow" />
      <SupplierPendingLogout />
      <div className="savo-supplier-onboard-wrap">
        <div className="savo-supplier-onboard-header">
          <SAVOLogo variant="primary-light" style={{ height: 30, width: "auto" }} className="savo-supplier-onboard-logo" />
          <p className="savo-supplier-status-label">Supplier Application</p>
        </div>

        <div className="savo-supplier-status-card">
          <div className={`savo-supplier-status-icon savo-supplier-status-icon--${accent}`}>
            <span className={`savo-supplier-status-pulse savo-supplier-status-pulse--${accent}`} />
            {icon}
          </div>
          <h1 className="savo-supplier-onboard-title">{title}</h1>
          <p className="savo-supplier-onboard-sub">{message}</p>
          {detail && (
            <div className="savo-supplier-status-detail">
              <span>{detail.label}</span>
              <b>{detail.value}</b>
            </div>
          )}
          {contactEmail && (
            <div className="savo-supplier-status-detail">
              <span>Contact our supplier team</span>
              <a href={`mailto:${contactEmail}`} className="savo-supplier-status-email">{contactEmail}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
