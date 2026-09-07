import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { I18nManager, Platform } from 'react-native';

/**
 * Theme and direction, provided once at the root of every surface.
 *
 * On web these also stamp `data-theme` and `dir` on the document element so
 * the generated `tokens.css` overrides and the CSS logical properties resolve.
 * On native they are context only — NativeWind reads the `dark:` variant from
 * the same context, and RTL is a device-level flag (`I18nManager`).
 */

export type ThemeName = 'light' | 'dark';
export type Direction = 'ltr' | 'rtl';

interface ThemeContextValue {
  theme: ThemeName;
  direction: Direction;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  direction: 'ltr',
});

export interface ThemeProviderProps {
  theme?: ThemeName;
  /** Omit to follow `I18nManager.isRTL`; pass to force one direction (the gallery does). */
  direction?: Direction;
}

export function ThemeProvider({
  theme = 'light',
  direction,
  children,
}: PropsWithChildren<ThemeProviderProps>): ReactElement {
  const resolvedDirection: Direction =
    direction ?? (I18nManager.isRTL ? 'rtl' : 'ltr');

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, direction: resolvedDirection }),
    [theme, resolvedDirection],
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('dir', resolvedDirection);
    // NativeWind's dark: variant keys off this class on web.
    root.classList.toggle('dark', theme === 'dark');
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeName {
  return useContext(ThemeContext).theme;
}

export function useDirection(): Direction {
  return useContext(ThemeContext).direction;
}

/** True when the layout mirrors. Never inferred from the locale at a call site. */
export function useIsRTL(): boolean {
  return useContext(ThemeContext).direction === 'rtl';
}
