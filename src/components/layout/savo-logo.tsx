import Image from "next/image";

type SavoLogoProps = {
  variant?: "white" | "black" | "primary";
  height?: number;
  priority?: boolean;
  className?: string;
  tagline?: boolean;
};

const logoByVariant = {
  white: "/brand/official/02-svg/SAVO-Logo-White.svg",
  black: "/brand/official/02-svg/SAVO-Logo-Black.svg",
  primary: "/brand/official/02-svg/SAVO-Logo-Primary.svg",
} as const;

export function SavoLogo({
  variant = "white",
  height = 32,
  priority = false,
  className = "",
  tagline = false,
}: SavoLogoProps) {
  return (
    <span
      className={`savo-logo-lockup ${className}`.trim()}
      style={{ "--savo-logo-height": `${height}px` } as React.CSSProperties}
    >
      <span className="savo-official-logo">
        <Image
          src={logoByVariant[variant]}
          width={155.335}
          height={50.289}
          alt="SAVO"
          className="savo-official-logo__artwork"
          priority={priority}
          draggable={false}
          unoptimized
        />
        <span className="savo-official-logo__fire-dot" aria-hidden="true" />
      </span>
      {tagline && <small lang="ar" dir="rtl">عالمك للاكتشاف</small>}
    </span>
  );
}
