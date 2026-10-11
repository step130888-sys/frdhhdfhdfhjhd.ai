import { ref } from 'vue';

const getInitialTheme = () => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('kedr_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

const isDark = ref(getInitialTheme());

export const useThemeStore = () => {
  const applyTheme = (dark, save = true) => {
    isDark.value = dark;
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (dark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
    if (save && typeof localStorage !== 'undefined') {
      localStorage.setItem('kedr_theme', dark ? 'dark' : 'light');
    }
  };

  const toggleTheme = () => {
    applyTheme(!isDark.value, true);
  };

  const initTheme = () => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('kedr_theme');
    if (saved) {
      applyTheme(saved === 'dark', false);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark, false);
    }

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        const explicit = localStorage.getItem('kedr_theme');
        if (!explicit) {
          applyTheme(e.matches, false);
        }
      });
    }
  };

  return {
    isDark,
    toggleTheme,
    initTheme,
    applyTheme
  };
};

