"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "cream" | "sepia" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  cycleTheme: () => void;
} | null>(null);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("cream");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "cream") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const cycleTheme = (): void => {
    setTheme((prev) =>
      prev === "cream" ? "dark" : prev === "dark" ? "sepia" : "cream",
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): { theme: Theme; cycleTheme: () => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
