/** Custom inline icon set — thin 1.6px strokes, consistent 24px grid. No icon library. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Search = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
export const Plus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Lock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const ChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const ArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const Clock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </svg>
);
export const Radius = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8.2 11l7.8-4M8.2 13l7.8 4" />
  </svg>
);
export const GraphIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="7" r="2.4" />
    <circle cx="18" cy="9" r="2.4" />
    <circle cx="12" cy="18" r="2.4" />
    <path d="M8 8l8 1M7.5 9.5l4 6.5M16.5 11l-3.5 5.5" />
  </svg>
);
export const Doc = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M13 3v5h5M10 13h6M10 17h6" />
  </svg>
);
export const Chat = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h16v10H9l-4 3v-3H4z" />
  </svg>
);
export const Api = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Fit = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
  </svg>
);
export const ZoomIn = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M11 8v6M8 11h6M20 20l-3.5-3.5" />
  </svg>
);
export const ZoomOut = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M8 11h6M20 20l-3.5-3.5" />
  </svg>
);
export const Copy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
);
export const Person = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
export const Return = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 0 0-10h-1" />
  </svg>
);

/** Entity-kind glyphs for suggestions and graph legends. */
export function KindGlyph({ kind, ...p }: P & { kind?: string }) {
  switch (kind) {
    case "account":
      return (
        <svg {...base(p)}>
          <path d="M4 20V8l8-4 8 4v12M4 20h16M9 20v-5h6v5" />
        </svg>
      );
    case "service":
      return <Api {...p} />;
    case "person":
      return <Person {...p} />;
    case "incident":
      return (
        <svg {...base(p)}>
          <path d="M12 4l9 16H3z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      );
    case "project":
      return (
        <svg {...base(p)}>
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M8 6V4h8v2M8 12h8M8 16h5" />
        </svg>
      );
    default:
      return (
        <svg {...base(p)}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
