import '../global.css';

import { Tabs } from 'expo-router';
import { I18nextProvider } from 'react-i18next';

import { colors } from '@dahab/tokens/theme';
import { Mark, ThemeProvider } from '@dahab/ui';

import { i18n } from '../src/i18n';
import { session } from '../src/session';

/**
 * The shell.
 *
 * A tab bar rather than a rail: this is the phone half of the vendor app, the
 * one a guide holds at the dock. Tabs come from the design system's marks, and
 * the set changes with the role — a guide has no Money entry because
 * `vendorStaff` holds no `payout.readOwn`, and leaving it out is more honest
 * than showing one that refuses.
 */
export default function RootLayout() {
  // Indexed access is `string | undefined` under noUncheckedIndexedAccess,
  // and the navigator's options are strict — so the fallbacks are real rather
  // than a cast. ink-line and cream-50 exist in both themes.
  const palette: Record<string, string> =
    session.theme === 'dark' ? { ...colors.light, ...colors.dark } : colors.light;
  const textColor = palette['text'] ?? colors.light['ink-900'];
  const mutedColor = palette['text-muted'] ?? colors.light['clay-700'];
  const surfaceColor = palette['surface'] ?? colors.light['cream-100'];
  const borderColor = palette['border'] ?? colors.light['cream-200'];
  const t = i18n.t.bind(i18n);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={session.theme} direction={session.direction} script={session.script}>
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
      </ThemeProvider>
    </I18nextProvider>
  );
}
