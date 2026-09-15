import '../global.css';

import { Tabs } from 'expo-router';
import { I18nextProvider } from 'react-i18next';

import { colors } from '@dahab/tokens/theme';
import { Mark, ThemeProvider } from '@dahab/ui';

import { i18n } from '../src/i18n';
import { SessionProvider, useSessionState } from '../src/SessionProvider';
import { SignInScreen } from '../src/SignInScreen';
import { localeFromUrl } from '../src/session';
import { directionOf } from '@dahab/i18n';

/**
 * The shell.
 *
 * A tab bar rather than a rail: this is the phone half of the vendor app, the
 * one a guide holds at the dock. Tabs come from the design system's marks, and
 * the set changes with the role — a guide has no Money entry because
 * `vendorStaff` holds no `payout.readOwn`, and leaving it out is more honest
 * than showing one that refuses.
 *
 * Nobody signed in gets the sign-in screen *instead of* the tabs, not as a
 * route above them. A `/sign-in` route would leave the tab bar visible
 * underneath, offering sections a visitor cannot open.
 */
export default function RootLayout() {
  // Theme and locale are read before anything mounts so the first paint is
  // already correct — this surface opens in Arabic, and a flash of English
  // on it would be the app's first lie.
  const locale = localeFromUrl();
  const theme = themeFromUrl();

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider
        theme={theme}
        direction={directionOf(locale)}
        script={locale === 'ar-EG' ? 'arabic' : 'latin'}
      >
        <SessionProvider>
          <Shell theme={theme} />
        </SessionProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

function Shell({ theme }: { theme: 'light' | 'dark' }) {
  const { session } = useSessionState();
  if (session === null) return <SignInScreen />;

  // Indexed access is `string | undefined` under noUncheckedIndexedAccess,
  // and the navigator's options are strict — so the fallbacks are real rather
  // than a cast. ink-line and cream-50 exist in both themes.
  const palette: Record<string, string> =
    theme === 'dark' ? { ...colors.light, ...colors.dark } : colors.light;
  const textColor = palette['text'] ?? colors.light['ink-900'];
  const mutedColor = palette['text-muted'] ?? colors.light['clay-700'];
  const surfaceColor = palette['surface'] ?? colors.light['cream-100'];
  const borderColor = palette['border'] ?? colors.light['cream-200'];
  const t = i18n.t.bind(i18n);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: textColor,
        tabBarInactiveTintColor: mutedColor,
        tabBarStyle: { backgroundColor: surfaceColor, borderTopColor: borderColor },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('vendor.tabs.today'), tabBarIcon: () => <Mark name="sun" size={24} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('vendor.tabs.bookings'), tabBarIcon: () => <Mark name="pass" size={24} /> }}
      />
      <Tabs.Screen
        name="services"
        options={{ title: t('vendor.tabs.services'), tabBarIcon: () => <Mark name="tank" size={24} /> }}
      />
      <Tabs.Screen
        name="pricing"
        options={{ title: t('vendor.tabs.pricing'), tabBarIcon: () => <Mark name="shell" size={24} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('vendor.tabs.more'), tabBarIcon: () => <Mark name="compass" size={24} noFlip /> }}
      />
    </Tabs>
  );
}

function themeFromUrl(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') return 'light';
  return new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';
}
