import type { ReactNode } from "react";

export type NavIconName =
  | "dashboard"
  | "discover"
  | "products"
  | "compare"
  | "notifications"
  | "settings"
  | "sign-in"
  | "sign-out";

const ink = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const accent = {
  fill: "#ffeb00",
  stroke: "currentColor",
  strokeWidth: 2.1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons: Record<NavIconName, ReactNode> = {
  dashboard: (
    <>
      <path d="M3 11 12 3.4 21 11" {...ink} />
      <path d="M5.4 9.8V20h13.2V9.8" {...ink} />
      <path d="M9.6 20v-4.6a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1V20" {...accent} />
    </>
  ),
  discover: (
    <>
      <circle cx="10.4" cy="10.4" r="6.2" {...accent} />
      <path d="m15 15 6 6" {...ink} />
      <path
        d="m10.4 7.2.85 1.95 1.95.85-1.95.85-.85 1.95-.85-1.95-1.95-.85 1.95-.85z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  products: (
    <>
      <path d="M3.6 4.4h6.8l9.4 9.4-6 6-9.4-9.4z" {...accent} />
      <circle cx="7.4" cy="8.2" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  compare: (
    <>
      <path d="M7 20V5" {...ink} />
      <path d="M3.7 8.3 7 5l3.3 3.3" {...ink} />
      <path d="M17 4v15" {...ink} />
      <path d="M13.7 15.7 17 19l3.3-3.3" {...ink} />
      <rect x="9.7" y="9" width="4.6" height="6" rx="1.2" {...accent} />
    </>
  ),
  notifications: (
    <>
      <path
        d="M6 17.2h12c-1.3-1.4-1.6-2.9-1.6-5.4 0-2.9-1.8-4.9-4.4-4.9S7.6 8.9 7.6 11.8c0 2.5-.3 4-1.6 5.4Z"
        {...accent}
      />
      <path d="M10.2 19.6a1.9 1.9 0 0 0 3.6 0" {...ink} />
      <path d="M12 3.4V2.2" {...ink} />
    </>
  ),
  settings: (
    <>
      <path d="M3.5 7h17" {...ink} />
      <path d="M3.5 17h17" {...ink} />
      <circle cx="9" cy="7" r="2.3" {...accent} />
      <circle cx="15" cy="17" r="2.3" {...accent} />
    </>
  ),
  "sign-in": (
    <>
      <path d="M13.5 3.5h5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-5" {...ink} />
      <path d="M3.5 12h9" {...ink} />
      <path d="M9.6 8.7 12.9 12l-3.3 3.3z" {...accent} />
    </>
  ),
  "sign-out": (
    <>
      <path d="M10.5 3.5h-5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h5" {...ink} />
      <path d="M20.5 12h-9" {...ink} />
      <path d="M14.4 8.7 11.1 12l3.3 3.3z" {...accent} />
    </>
  ),
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg className="glyph nav-glyph" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
