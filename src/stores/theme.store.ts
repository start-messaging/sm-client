import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storageKey } from '@/config/app';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Theme preference (light/dark/system), persisted. The actual `.dark` class on
 * <html> is applied by `applyTheme`, called once at boot and whenever it changes
 * — including reacting to the OS preference while in 'system' mode.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    { name: storageKey('theme') },
  ),
);

const mql = () => window.matchMedia('(prefers-color-scheme: dark)');

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return mql().matches ? 'dark' : 'light';
  return theme;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/** Wire OS-preference changes (only relevant while theme === 'system'). */
export function initThemeListener(): () => void {
  const handler = () => {
    if (useThemeStore.getState().theme === 'system') applyTheme('system');
  };
  const m = mql();
  m.addEventListener('change', handler);
  applyTheme(useThemeStore.getState().theme);
  return () => m.removeEventListener('change', handler);
}
