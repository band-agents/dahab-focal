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
 * Four tabs, matching Board 04's own `tabs` array and its per-tab marks
 * (sun / compass / pass / mask). Discover is a folder with its own nested
 * stack (search → results → filters/sort/category/site/ask); the other three
 * are flat placeholder screens — Board 03 Home is approved but not coded yet,
 * and Trips/Account were never designed (Boards 06–08, HANDOVER.md §13).
 */
export default function RootLayout() {
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
            options={{ title: t('traveler.tabs.home'), tabBarIcon: () => <Mark name="sun" size={24} /> }}
          />
          <Tabs.Screen
            name="discover"
            options={{
              title: t('traveler.tabs.discover'),
              tabBarIcon: () => <Mark name="compass" size={24} noFlip />,
            }}
          />
          <Tabs.Screen
            name="trips"
            options={{ title: t('traveler.tabs.trips'), tabBarIcon: () => <Mark name="pass" size={24} /> }}
          />
          <Tabs.Screen
            name="account"
            options={{ title: t('traveler.tabs.account'), tabBarIcon: () => <Mark name="mask" size={24} /> }}
          />
        </Tabs>
      </ThemeProvider>
    </I18nextProvider>
  );
}
