import { createI18nSync, type I18nInstance } from '@dahab/i18n';

import { localeFromUrl } from './session';

/**
 * One instance, created at the opening locale before React renders.
 *
 * Synchronous on purpose: an instance that initialises in an effect paints
 * en-GB first and the real language a tick later, which on this surface means
 * a guide sees English for a frame before Arabic arrives.
 */
export const i18n: I18nInstance = createI18nSync({
  locale: localeFromUrl(),
  isolated: true,
});
