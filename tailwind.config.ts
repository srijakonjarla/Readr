import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  // Theme switching is via [data-theme] on <html>; no class-based dark mode needed.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Tight", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Source Serif 4"', '"Iowan Old Style"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ["Inter Tight", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        paper: "var(--paper)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          2: "var(--rule-2)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
      },
      // Custom font sizes for values Tailwind defaults don't cover.
      // For 12/14/16/18/24/30/36/48px use Tailwind built-ins
      // (text-xs, text-sm, text-base, text-lg, text-2xl, text-3xl, etc).
      fontSize: {
        kicker: ["11px", { lineHeight: "1.3" }],
        chapter: ["56px", { lineHeight: "1" }],
        hero: ["64px", { lineHeight: "1" }],
      },
      borderRadius: {
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(31,27,22,.04), 0 24px 60px -30px rgba(31,27,22,.18)",
        mini: "0 6px 16px -8px rgba(31,27,22,.3)",
        pill: "0 1px 0 rgba(255,255,255,.5) inset, 0 8px 24px -10px rgba(31,27,22,.18)",
        drawer: "0 24px 60px -20px rgba(31,27,22,.25)",
        pop: "0 12px 28px -10px rgba(0,0,0,.35)",
        cta: "0 1px 0 rgba(255,255,255,.25) inset, 0 12px 28px -8px rgba(0,0,0,.25)",
      },
      maxWidth: {
        page: "1320px",
        reading: "calc(var(--reading-width) + 200px)",
      },
      keyframes: {
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "dot-pulse": {
          "0%, 80%, 100%": { opacity: "0.2" },
          "40%": { opacity: "1" },
        },
      },
      animation: {
        pulse2: "pulse2 2s ease-in-out infinite",
        "dot-pulse": "dot-pulse 1.2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
