/**
 * The seven locales, defined once. Adding an eighth means adding it here and
 * shipping a full message file in the same commit (CLAUDE.md).
 */

export const LOCALES = [
  'en-GB',
  'ar-EG',
  'ru-RU',
  'it-IT',
  'fr-FR',
  'es-ES',
  'de-DE',
] as const;

export type Locale = (typeof LOCALES)[number];

/** en-GB is the source of truth every other file is diffed against. */
export const SOURCE_LOCALE: Locale = 'en-GB';

export type Direction = 'ltr' | 'rtl';

/**
 * Numeral systems a user can choose between. Egypt's default in digital
 * products is Western (`latn`) even in Arabic, so that is the default here —
 * Eastern Arabic-Indic (`arab`) is opt-in.
 */
export const NUMBERING_SYSTEMS = ['latn', 'arab'] as const;
export type NumberingSystem = (typeof NUMBERING_SYSTEMS)[number];

export interface LocaleDescriptor {
  readonly code: Locale;
  readonly direction: Direction;
  /** Name of the language in the language itself, for the locale switcher. */
  readonly endonym: string;
  readonly englishName: string;
  /** Numbering systems this locale is allowed to offer the user. */
  readonly numberingSystems: readonly NumberingSystem[];
  readonly defaultNumberingSystem: NumberingSystem;
  /** CLDR plural categories this locale actually uses, for cardinal counts. */
  readonly pluralCategories: readonly Intl.LDMLPluralRule[];
}

export const LOCALE_DESCRIPTORS: Readonly<Record<Locale, LocaleDescriptor>> = {
  'en-GB': {
    code: 'en-GB',
    direction: 'ltr',
    endonym: 'English',
    englishName: 'English (UK)',
    numberingSystems: ['latn'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['one', 'other'],
  },
  'ar-EG': {
    code: 'ar-EG',
    direction: 'rtl',
    endonym: 'العربية',
    englishName: 'Arabic (Egypt)',
    numberingSystems: ['latn', 'arab'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['zero', 'one', 'two', 'few', 'many', 'other'],
  },
  'ru-RU': {
    code: 'ru-RU',
    direction: 'ltr',
    endonym: 'Русский',
    englishName: 'Russian',
    numberingSystems: ['latn'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['one', 'few', 'many', 'other'],
  },
  'it-IT': {
    code: 'it-IT',
    direction: 'ltr',
    endonym: 'Italiano',
    englishName: 'Italian',
    numberingSystems: ['latn'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['one', 'many', 'other'],
  },
  'fr-FR': {
    code: 'fr-FR',
    direction: 'ltr',
    endonym: 'Français',
    englishName: 'French',
    numberingSystems: ['latn'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['one', 'many', 'other'],
  },
  'es-ES': {
    code: 'es-ES',
    direction: 'ltr',
    endonym: 'Español',
    englishName: 'Spanish',
    numberingSystems: ['latn'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['one', 'many', 'other'],
  },
  'de-DE': {
    code: 'de-DE',
    direction: 'ltr',
    endonym: 'Deutsch',
    englishName: 'German',
    numberingSystems: ['latn'],
    defaultNumberingSystem: 'latn',
    pluralCategories: ['one', 'other'],
  },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): Direction {
  return LOCALE_DESCRIPTORS[locale].direction;
}

export function isRtl(locale: Locale): boolean {
  return directionOf(locale) === 'rtl';
}

/**
 * Resolve an arbitrary BCP-47 tag (a device locale, an Accept-Language entry)
 * to one of ours, falling back to the source locale.
 */
export function resolveLocale(requested: string | undefined | null): Locale {
  if (!requested) return SOURCE_LOCALE;
  if (isLocale(requested)) return requested;

  const language = requested.split('-')[0]?.toLowerCase();
  if (language === undefined) return SOURCE_LOCALE;

  const match = LOCALES.find((locale) => locale.split('-')[0]?.toLowerCase() === language);
  return match ?? SOURCE_LOCALE;
}
