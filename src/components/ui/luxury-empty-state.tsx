import { Link } from "@/i18n/routing";

/**
 * Design Language v1, batch 2 — Luxury Empty States.
 * A single, minimal, brand-toned illustration (soft concentric circles
 * + a floating "spark" dot echoing the Aura sweep) reused across every
 * empty state on the site instead of a different icon per page, so it
 * reads as one consistent visual language.
 */
function EmptyStateIllustration() {
  return (
    <svg viewBox="0 0 160 160" className="mx-auto h-28 w-28" aria-hidden="true">
      <circle cx="80" cy="80" r="64" fill="#0B3D2E" opacity="0.05" />
      <circle cx="80" cy="80" r="44" fill="#0B3D2E" opacity="0.06" />
      <circle cx="80" cy="80" r="26" fill="#0B3D2E" opacity="0.08" />
      <circle cx="104" cy="56" r="5" fill="#D4AF37" opacity="0.9" />
      <circle cx="52" cy="98" r="3" fill="#D4AF37" opacity="0.5" />
    </svg>
  );
}

export function LuxuryEmptyState({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <EmptyStateIllustration />
      <h2 className="mt-4 text-lg font-bold text-saveo-emerald-700">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-saveo-emerald-700/50">{subtitle}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} onClick={onCtaClick} className="btn-primary mt-6 inline-flex">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
