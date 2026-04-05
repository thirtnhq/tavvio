"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's preference: light, dark, or system */
  preference: ThemePreference;
  /** The resolved theme applied to the DOM: light or dark */
  theme: ResolvedTheme;
  /** Cycle through light → dark → system */
  toggleTheme: () => void;
  /** Set an explicit preference */
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "useroutr-theme";

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

function applyThemeToDOM(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  // Initialize from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initial: ThemePreference = stored ?? "system";
    setPreferenceState(initial);
    const resolved = resolveTheme(initial);
    setTheme(resolved);
    applyThemeToDOM(resolved);
  }, []);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = e.matches ? "dark" : "light";
      setTheme(resolved);
      applyThemeToDOM(resolved);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem(STORAGE_KEY, pref);
    const resolved = resolveTheme(pref);
    setTheme(resolved);
    applyThemeToDOM(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(
      preference === "light" ? "dark" : preference === "dark" ? "system" : "light"
    );
  }, [preference, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, theme, toggleTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
