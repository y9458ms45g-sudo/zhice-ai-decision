import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { THEMES, type ThemeName } from './theme';
import { knowledgeApi } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'kb-theme';
const CARD_SECTION_KEY = 'theme_preference';

function applyThemeToDom(theme: ThemeName): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.dataset.kbTheme = 'dark';
  } else {
    delete root.dataset.kbTheme;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const serverLoadedRef = useRef(false);
  const userTouchedRef = useRef(false);

  useEffect(() => {
    let initial: ThemeName = 'light';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        initial = saved;
      }
    } catch {
      // noop
    }
    setThemeState(initial);
    applyThemeToDom(initial);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      try {
        const cards = await knowledgeApi.getCards();
        const pref = cards.find((c) => c.sectionKey === CARD_SECTION_KEY);
        if (
          pref &&
          (pref.content === 'light' || pref.content === 'dark') &&
          !userTouchedRef.current &&
          !cancelled
        ) {
          const serverTheme: ThemeName = pref.content as ThemeName;
          setThemeState(serverTheme);
          applyThemeToDom(serverTheme);
          try {
            localStorage.setItem(STORAGE_KEY, serverTheme);
          } catch {
            // noop
          }
        }
      } catch (error) {
        logger.warn('读取主题偏好失败', error);
      } finally {
        if (!cancelled) {
          serverLoadedRef.current = true;
        }
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: ThemeName): void => {
    userTouchedRef.current = true;
    setThemeState(next);
    applyThemeToDom(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // noop
    }
    void knowledgeApi.updateCard(CARD_SECTION_KEY, next).catch((error): void => {
      logger.warn('保存主题偏好失败', error);
    });
  }, []);

  const toggleTheme = useCallback((): void => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: 'light', setTheme: (): void => {}, toggleTheme: (): void => {} };
  }
  return ctx;
}

export { THEMES };
