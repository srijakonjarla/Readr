import type { CSSProperties } from "react";

/**
 * Shared style tokens for inline `style={{}}` props.
 *
 * Anything that can be a Tailwind utility or globals.css class should live
 * there instead — this file is for cases that need a real CSSProperties
 * object: dynamic positioning, conditional spreads, etc.
 */

export const FONT = {
  serif: '"Source Serif 4", "Iowan Old Style", Georgia, serif',
  sans: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const SHADOW = {
  pop: "0 12px 28px -10px rgba(0,0,0,.35)",
  mini: "0 6px 16px -8px rgba(31,27,22,.3)",
  cta: "0 1px 0 rgba(255,255,255,.25) inset, 0 12px 28px -8px rgba(0,0,0,.25)",
  drawer: "0 24px 60px -20px rgba(31,27,22,.25)",
} as const;

export const COLOR = {
  ink: "var(--ink)",
  ink2: "var(--ink-2)",
  ink3: "var(--ink-3)",
  ink4: "var(--ink-4)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  paper: "var(--paper)",
  bg: "var(--bg)",
  bg2: "var(--bg-2)",
  rule: "var(--rule)",
  rule2: "var(--rule-2)",
  white: "#fff",
  whiteAlpha: (a: number) => `rgba(255,255,255,${a})`,
} as const;

/** Headings used in Library / Reader hero sections. */
export const headingStyle = (size: number): CSSProperties => ({
  margin: 0,
  fontSize: size,
  fontWeight: 700,
  letterSpacing: "-0.035em",
  lineHeight: 1,
  textWrap: "balance" as CSSProperties["textWrap"],
});

/** Standard kicker/eyebrow style with custom letter-spacing. */
export const kickerStyle = (letterSpacing = "0.04em"): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing,
  textTransform: "uppercase",
});

/** Position helpers for dynamic-coordinate popovers. */
export const popoverPosition = (x: number, y: number): CSSProperties => ({
  left: x,
  top: y,
});
