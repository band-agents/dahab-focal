import { createI18nSync, type I18nInstance } from '@dahab/i18n';

import { config } from './config';

/**
 * One i18n instance, created at the configured locale before React renders.
 *
 * Synchronous on purpose: an instance that initialises in an effect renders
 * en-GB first and the real language a tick later, and a screenshot taken in
 * between is a picture of the wrong thing.
 */
export const i18n: I18nInstance = createI18nSync({
  locale: config.locale,
  isolated: true,
});
