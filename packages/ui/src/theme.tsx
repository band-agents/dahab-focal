import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { I18nManager, Platform } from 'react-native';

/**
 * On the web a layout effect runs before the browser paints, so the document
 * is stamped with no flash of the wrong theme. During static prerender there
 * is no document and no paint, so the plain effect is used and React does not
 * warn. On native both are no-ops for this purpose.
 */
const useDocumentEffect =
  Platform.OS === 'web' && typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

/**
 * Which script the surface is currently setting.
 *
 * Not the same question as direction: both Arabic and Hebrew are RTL, but only
 * Arabic swaps the display face. The app knows its locale and passes this;
 * @dahab/ui deliberately does not depend on @dahab/i18n to work it out.
 */
export type Script = 'latin' | 'arabic';

interface ThemeContextValue {
  theme: ThemeName;
  direction: Direction;
  script: Script;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  direction: 'ltr',
  script: 'latin',
});

export interface ThemeProviderProps {
  theme?: ThemeName;
  /** Omit to follow `I18nManager.isRTL`; pass to force one direction (the gallery does). */
  direction?: Direction;
  /** Arabic swaps the display face to Baloo Bhaijaan 2; body stays Rubik. */
  script?: Script;
}

export function ThemeProvider({
  theme = 'light',
  direction,
  script = 'latin',
  children,
}: PropsWithChildren<ThemeProviderProps>): ReactElement {
  const resolvedDirection: Direction =
    direction ?? (I18nManager.isRTL ? 'rtl' : 'ltr');

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, direction: resolvedDirection, script }),
    [theme, resolvedDirection, script],
  );

  // Mutating the document during render is a side effect in the render phase:
  // it runs twice under StrictMode and can be discarded entirely by a
  // concurrent render that React throws away. It belongs in an effect.
  useDocumentEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    // The generated tokens.css swaps every --color-* under [data-theme='dark'],
    // so this attribute is what actually repaints the palette.
    root.setAttribute('data-theme', theme);
    // `dir` is what makes the CSS logical properties behind ms-/me-/ps-/pe-
    // resolve to the other edge. RTL on web needs nothing else.
    root.setAttribute('dir', resolvedDirection);
    // NativeWind's dark: variant keys off this class on web. Colours do not
    // need it — they come from the custom properties above — but a component
    // that reaches for `dark:` should still work.
    root.classList.toggle('dark', theme === 'dark');
  }, [theme, resolvedDirection]);

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

export function useScript(): Script {
  return useContext(ThemeContext).script;
}

/**
 * The display face for the current script.
 *
 * CLAUDE.md: display and brand and every price are Baloo 2; Arabic display is
 * Baloo Bhaijaan 2, and Arabic body stays Rubik. Returning the utility class
 * rather than the family name keeps the decision in one place and keeps both
 * names statically visible to Tailwind's content scan.
 */
export function useDisplayFontClass(): 'font-display' | 'font-arabicDisplay' {
  return useScript() === 'arabic' ? 'font-arabicDisplay' : 'font-display';
}

/** Body is Rubik in every script, so this is constant — named for symmetry. */
export function useBodyFontClass(): 'font-ui' {
  return 'font-ui';
}
