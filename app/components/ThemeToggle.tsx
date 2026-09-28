"use client";

import { useSyncExternalStore } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { THEME_KEY, isTheme, resolveTheme, type Theme } from "@/lib/theme";

const CHANGE = "themechange";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function stored(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  // With no stored choice the site follows the system, also when it changes while the page is open
  const onSystem = () => {
    if (!isTheme(stored())) apply(resolveTheme(null, media.matches));
  };
  media.addEventListener("change", onSystem);
  window.addEventListener(CHANGE, onChange);
  return () => {
    media.removeEventListener("change", onSystem);
    window.removeEventListener(CHANGE, onChange);
  };
}

const current = (): Theme | null => {
  const theme = document.documentElement.dataset.theme;
  return isTheme(theme) ? theme : null;
};

/** Sun/moon button: switches between light and dark. Choosing what the system already uses forgets the choice. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  // null on the server: the theme is only known in the browser (set before paint by the layout script)
  const theme = useSyncExternalStore(subscribe, current, () => null);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const systemDark = window.matchMedia(DARK_QUERY).matches;
    try {
      if (next === resolveTheme(null, systemDark)) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Without storage the choice lasts until the page is reloaded
    }
    apply(next);
  };

  const label = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-whiskey-800 transition-colors hover:bg-whiskey-100 hover:text-whiskey-950 ${className}`}
    >
      {theme === "dark" ? <FaSun aria-hidden className="h-4 w-4" /> : theme === "light" ? <FaMoon aria-hidden className="h-4 w-4" /> : null}
    </button>
  );
}
