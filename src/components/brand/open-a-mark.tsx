import React from "react";

/**
 * OpenAMark — Phase 1 Brand Foundation. Compact discovery/device mark.
 * ============================================================
 * The "A" letterform plus its Discovery Point, extracted together as
 * a compact standalone icon per the brief's Step 6 ("derived from
 * approved A geometry, not a second master logo"). Both paths' 'd'
 * data are byte-for-byte identical to savo-master-logo.tsx — only the
 * viewBox changed, cropped to the real combined bounding box of the
 * "A" path (x:76-166, y:1-71) and the Discovery Point (x:110-130,
 * y:44-66), both taken directly from the master logo's own coordinate
 * space. Not a redraw, not a second master logo.
 */
export interface OpenAMarkProps extends React.SVGAttributes<SVGSVGElement> {
  title?: string;
  pointColor?: string;
}

export function OpenAMark({ title = "SAVO", pointColor = "#00D4A1", ...props }: OpenAMarkProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="74 -1 94 74" role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <path
        d="M 108 1 L 105 7 L 105 9 L 97 24 L 97 26 L 90 39 L 90 41 L 82 56 L 82 58 L 77 67 L 77 69 L 76 71 L 94 71 L 95 70 L 97 66 L 97 64 L 103 53 L 103 51 L 108 42 L 108 40 L 114 29 L 114 27 L 120 15 L 122 16 L 122 18 L 125 23 L 125 25 L 129 32 L 129 34 L 135 45 L 135 47 L 140 56 L 140 58 L 142 60 L 142 62 L 146 70 L 147 71 L 166 71 L 151 41 L 151 39 L 143 24 L 143 22 L 135 7 L 135 5 L 133 1 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path d="M 119 44 L 111 49 L 110 51 L 110 60 L 115 64 L 119 66 L 122 66 L 130 61 L 130 49 L 124 46 L 122 44 Z" fill={pointColor} fillRule="evenodd" />
    </svg>
  );
}
