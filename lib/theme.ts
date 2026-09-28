// Light and dark theme. With no choice stored the site follows the system (prefers-color-scheme);
// the header toggle stores an explicit choice. Pure: shared by the layout script and the toggle.

export type Theme = 'light' | 'dark';

/** localStorage key of the reader's explicit choice. */
export const THEME_KEY = 'theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** The theme to show: the stored choice if there is a valid one, otherwise the system's. */
export function resolveTheme(stored: string | null, systemDark: boolean): Theme {
  return isTheme(stored) ? stored : systemDark ? 'dark' : 'light';
}

/**
 * Runs in <head> before the first paint, so a dark page never flashes light.
 * Sets data-theme on <html>; globals.css reads it. Storage can throw (private mode, blocked cookies).
 */
export const THEME_SCRIPT = `(function(){try{var s=null;try{s=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=(s==='light'||s==='dark')?s:(d?'dark':'light')}catch(e){}})()`;
