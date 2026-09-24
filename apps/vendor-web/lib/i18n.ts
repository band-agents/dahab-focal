import { createI18nSync, type Locale } from '@dahab/i18n/server';

/**
 * A per-request translator.
 *
 * `isolated` matters on the server: the shared singleton would carry one
 * request's language into the next. Every locale is its own route, so an
 * instance is built per render and thrown away.
 */
export function translator(locale: Locale) {
  const instance = createI18nSync({ locale, isolated: true });
  return instance.t.bind(instance);
}

export type Translate = ReturnType<typeof translator>;
