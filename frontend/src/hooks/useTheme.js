import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ai-theme';
const DEFAULT_THEME = 'dark';

/** Current console theme (as applied to <html data-theme>). */
export function docTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : DEFAULT_THEME;
}

// Dark/light console theme (lab standard, mirror-inversion tokens; owner, 30.08).
// The choice persists per browser; the theme is a token override on
// <html data-theme="..."> applied synchronously during render.
export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — theme just won't persist */
    }
  }, [theme]);

  // Applied synchronously during render (not in an effect) so that
  // deep children read the current theme the same render pass the
  // toggle happens in.
  document.documentElement.dataset.theme = theme;

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}