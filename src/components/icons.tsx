import type { ReactNode } from "react";

// Inline copies of the six lucide icons this app uses, so it keeps zero icon
// dependencies. Names and paths match lucide-react, so adopting the package
// later is an import change only. 2px stroke matches the select chevron.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative: the label beside every icon already states the action.
      aria-hidden="true"
      focusable="false"
      style={{ verticalAlign: "-0.125em", flex: "none" }}
    >
      {children}
    </svg>
  );
}

export function ArrowLeft() {
  return (
    <Icon>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Icon>
  );
}

export function ArrowRight() {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  );
}

export function ArrowDown() {
  return (
    <Icon>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </Icon>
  );
}

export function ArrowUpRight() {
  return (
    <Icon>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </Icon>
  );
}

export function Plus() {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  );
}

export function House() {
  return (
    <Icon>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Icon>
  );
}
