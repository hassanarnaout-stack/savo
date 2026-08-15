import React from "react";

/**
 * DiscoveryPoint — Phase 1 Brand Foundation. Secondary brand device.
 * ============================================================
 * The exact accent shape that lives inside the "A" in SAVOLogo,
 * extracted as its own standalone component per the brief's Step 6.
 * The path 'd' data is byte-for-byte identical to the shape inside
 * savo-master-logo.tsx — only the viewBox changed, cropped tightly
 * around this shape's real bounding box (x:110-130, y:44-66 in the
 * master logo's coordinate space) so it renders correctly on its own.
 * This is NOT a redraw — cropping a viewBox around unchanged path
 * data is standard SVG practice, not a geometry change.
 *
 * Never treated as the master logo. Defaults to the real SAVO
 * Discovery token (#00D4A1).
 */
export interface DiscoveryPointProps extends React.SVGAttributes<SVGSVGElement> {
  color?: string;
}

export function DiscoveryPoint({ color = "#00D4A1", ...props }: DiscoveryPointProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="108 42 24 26" role="img" aria-label="SAVO Discovery Point" {...props}>
      <path d="M 119 44 L 111 49 L 110 51 L 110 60 L 115 64 L 119 66 L 122 66 L 130 61 L 130 49 L 124 46 L 122 44 Z" fill={color} fillRule="evenodd" />
    </svg>
  );
}
