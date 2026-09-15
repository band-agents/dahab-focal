/**
 * The React binding.
 *
 * Importing this module registers `initReactI18next` with the shared i18next
 * factory, so `createI18nSync()` wires the React context on the surfaces that
 * have one. The main entry point (`@dahab/i18n`) imports it for that side
 * effect; `@dahab/i18n/server` deliberately does not.
 */
import { initReactI18next } from 'react-i18next';

import { registerReactBinding } from './i18n.ts';

registerReactBinding(initReactI18next);

export { Trans, useTranslation } from 'react-i18next';
export { useDirection, useLocale } from './direction.ts';
