import { ref } from 'vue';

const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('kedr_theme') : null;
// Default to light unless user previously selected dark or explicitly prefers dark
const isDark = ref(savedTheme ? savedTheme === 'dark' : false);

export const useThemeStore = () => {
  const applyTheme = (dark) => {
    isDark.value = dark;
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('kedr_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('kedr_theme', 'light');
    }
  };

  const toggleTheme = () => {
    applyTheme(!isDark.value);
  };

  const initTheme = () => {
    const saved = localStorage.getItem('kedr_theme');
    if (saved) {
      applyTheme(saved === 'dark');
    } else {
      // Default to light mode for the requested fresh white theme
      applyTheme(false);
    }
  };

  return {
    isDark,
    toggleTheme,
    initTheme,
    applyTheme
  };
};
