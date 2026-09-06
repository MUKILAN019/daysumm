import React, { createContext, useCallback, useContext, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';
import { Colors, DarkColors, type ThemeColors } from './tokens';

let storage: ReturnType<typeof createMMKV> | null = null;
try {
  storage = createMMKV();
} catch {
  storage = null;
}
const THEME_KEY = '@daysumm/theme';

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: Colors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return storage?.getString(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        storage?.set(THEME_KEY, next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DarkColors : Colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
