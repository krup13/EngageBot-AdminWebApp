"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type Language = "en" | "ms";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  language: Language;
  setLanguage: (l: Language) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  language: "en",
  setLanguage: () => {},
});

const STORAGE_KEY = "engagebot-settings";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
}

function readStorage(): { theme: Theme; language: Language } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<{ theme: Theme; language: Language }>;
      return {
        theme: parsed.theme ?? "light",
        language: parsed.language ?? "en",
      };
    }
  } catch {}
  return { theme: "light", language: "en" };
}

function writeStorage(patch: Partial<{ theme: Theme; language: Language }>) {
  try {
    const current = readStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [language, setLanguageState] = useState<Language>("en");

  // Load persisted settings and apply on mount
  useEffect(() => {
    const stored = readStorage();
    const resolved = stored.theme === "system" ? getSystemTheme() : stored.theme;
    setThemeState(stored.theme);
    setResolvedTheme(resolved);
    setLanguageState(stored.language);
    applyTheme(resolved);
  }, []);

  // Keep resolved theme in sync when system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    const resolved = t === "system" ? getSystemTheme() : t;
    setThemeState(t);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    writeStorage({ theme: t });
  }, []);

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    writeStorage({ language: l });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, language, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
