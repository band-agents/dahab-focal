import '../global.css';

import { Stack } from 'expo-router';
import { I18nextProvider } from 'react-i18next';

import { ThemeProvider } from '@dahab/ui';

import { config } from '../src/config';
import { i18n } from '../src/i18n';

/**
 * Theme, direction and language all come from the URL (see src/config.ts), so
 * `scripts/shoot.mjs` can drive the four required screenshots by loading four
 * addresses rather than by four builds.
 */
export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={config.theme} direction={config.direction}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </I18nextProvider>
  );
}
