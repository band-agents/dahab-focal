/**
 * The i18next instance.
 *
 * i18next + i18next-icu is the one stack that runs unchanged in React Native
 * (Hermes), react-native-web and the Next.js App Router. `next-intl` does not
 * leave the Next.js runtime, which would mean two message pipelines and two
 * chances to drift.
 *
 * Interpolation is disabled: every substitution goes through ICU. i18next's
 * own `{{mustache}}` interpolation and its `_plural` key suffixes are both
 * off, so there is exactly one way to write a message and Arabic's six plural
 * categories and Russian's four are handled by the formatter rather than by
 * a key-naming convention that only covers two.
 */

import i18next, { type i18n as I18nInstance, type Resource } from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import {
  LOCALES,
  LOCALE_DESCRIPTORS,
  SOURCE_LOCALE,
  resolveLocale,
  type Locale,
  type NumberingSystem,
} from './locales';

import deDE from '../messages/de-DE.json';
import enGB from '../messages/en-GB.json';
import esES from '../messages/es-ES.json';
import frFR from '../messages/fr-FR.json';
import itIT from '../messages/it-IT.json';
import arEG from '../messages/ar-EG.json';
import ruRU from '../messages/ru-RU.json';

export const DEFAULT_NAMESPACE = 'common';

type MessageFile = Record<string, unknown>;

/**
 * `$meta` carries the translation bookkeeping (which keys are still English
 * placeholders). It is stripped before the catalogue reaches i18next so it can
 * never be looked up as a message.
 */
function stripMeta(file: MessageFile): MessageFile {
  const { $meta: _meta, ...messages } = file;
  return messages;
}

const CATALOGUES: Readonly<Record<Locale, MessageFile>> = {
  'en-GB': enGB as MessageFile,
  'ar-EG': arEG as MessageFile,
  'ru-RU': ruRU as MessageFile,
  'it-IT': itIT as MessageFile,
  'fr-FR': frFR as MessageFile,
  'es-ES': esES as MessageFile,
  'de-DE': deDE as MessageFile,
};

export function buildResources(): Resource {
  const resources: Resource = {};
  for (const locale of LOCALES) {
    resources[locale] = { [DEFAULT_NAMESPACE]: stripMeta(CATALOGUES[locale]) };
  }
  return resources;
}

export interface CreateI18nOptions {
  readonly locale?: string | undefined;
  readonly numberingSystem?: NumberingSystem | undefined;
  /** Fail loudly on a missing key in development; fall back silently in production. */
  readonly debug?: boolean;
  /** Provide an isolated instance instead of mutating the shared singleton. */
  readonly isolated?: boolean;
}

/**
 * i18next's language stays a plain locale so resource resolution works the
 * ordinary way; the numbering system is bolted on only when the tag is handed
 * to IntlMessageFormat. That is what makes `{count, number}` inside a message
 * honour the user's digit preference the same way the standalone formatters
 * do, without `ar-EG-u-nu-latn` having to exist as a resource key.
 */
interface NumberingPreference {
  current: NumberingSystem;
}

const preferences = new WeakMap<I18nInstance, NumberingPreference>();

/** i18next stores the plugin instance on the i18n object; this types the read. */
interface IcuPlugin {
  clearCache(): void;
}
function icuPluginOf(instance: I18nInstance): IcuPlugin | undefined {
  return (instance as unknown as { ICU?: IcuPlugin }).ICU;
}

function defaultNumbering(locale: Locale): NumberingSystem {
  return LOCALE_DESCRIPTORS[locale].defaultNumberingSystem;
}

/**
 * A message that does not parse as ICU is a bug in the catalogue, and
 * i18next-icu's default behaviour is to swallow it and render the raw
 * `{count, plural, ...}` source to the user. That failure mode is worse than a
 * crash in development and worse than a fallback in production, so it is
 * replaced here: loud in development and test, degraded-but-silent in
 * production, and never the raw ICU source either way.
 */
function makeParseErrorHandler(debug: boolean) {
  return (error: Error, key: string, res: string): string => {
    const message = `ICU message "${key}" failed to parse: ${error.message}`;
    if (debug || process.env['NODE_ENV'] !== 'production') {
      throw new Error(message);
    }
    console.error(message, { source: res });
    return '';
  };
}

export async function createI18n(options: CreateI18nOptions = {}): Promise<I18nInstance> {
  const locale = resolveLocale(options.locale);
  const instance = options.isolated === true ? i18next.createInstance() : i18next;
  const debug = options.debug ?? false;

  const preference: NumberingPreference = {
    current: options.numberingSystem ?? defaultNumbering(locale),
  };
  preferences.set(instance, preference);

  await instance
    .use(
      new ICU({
        parseLngForICU: (lng: string) => `${lng}-u-nu-${preference.current}`,
        parseErrorHandler: makeParseErrorHandler(debug),
      }),
    )
    .use(initReactI18next)
    .init({
      resources: buildResources(),
      lng: locale,
      fallbackLng: SOURCE_LOCALE,
      supportedLngs: [...LOCALES],
      // A missing ar-EG key must fall back to English, never to a raw key path
      // rendered on screen.
      returnNull: false,
      returnEmptyString: false,
      defaultNS: DEFAULT_NAMESPACE,
      ns: [DEFAULT_NAMESPACE],
      debug,
      interpolation: {
        // ICU owns every substitution. React escapes output already.
        escapeValue: false,
      },
      react: { useSuspense: false },
    });

  return instance;
}

/**
 * Change language and numbering system together.
 *
 * i18next-icu memoises compiled messages under the *untransformed* language,
 * so switching numbering system without clearing that cache would keep
 * rendering the previous digits.
 */
export async function setLocale(
  instance: I18nInstance,
  locale: Locale,
  numberingSystem?: NumberingSystem,
): Promise<void> {
  const preference = preferences.get(instance);
  const next = numberingSystem ?? defaultNumbering(locale);
  if (preference !== undefined && preference.current !== next) {
    preference.current = next;
    icuPluginOf(instance)?.clearCache();
  }
  await instance.changeLanguage(locale);
}

/** The numbering system currently in effect for an instance. */
export function getNumberingSystem(instance: I18nInstance): NumberingSystem {
  return (
    preferences.get(instance)?.current ??
    defaultNumbering(resolveLocale(instance.resolvedLanguage ?? instance.language))
  );
}

export { i18next };
export type { I18nInstance };
