import { createI18nSync, type I18nInstance } from '@dahab/i18n';

import { session } from './session';

/**
 * One instance, created at the session's locale before React renders.
 *
 * Synchronous on purpose: an instance that initialises in an effect paints
 * en-GB first and the real language a tick later — see apps/vendor/src/i18n.ts.
 */
export const i18n: I18nInstance = createI18nSync({
  locale: session.locale,
  isolated: true,
});
