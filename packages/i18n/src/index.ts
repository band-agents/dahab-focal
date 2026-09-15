export {
  LOCALES,
  LOCALE_DESCRIPTORS,
  NUMBERING_SYSTEMS,
  SOURCE_LOCALE,
  directionOf,
  isLocale,
  isRtl,
  resolveLocale,
  type Direction,
  type Locale,
  type LocaleDescriptor,
  type NumberingSystem,
} from './locales.ts';

export {
  CURRENCIES,
  add,
  applyRate,
  compare,
  fromDecimalString,
  isCurrencyCode,
  isZero,
  minorUnitExponent,
  money,
  multiply,
  roundMinor,
  subtract,
  sum,
  toDecimalString,
  zero,
  type CurrencyCode,
  type Money,
  type RoundingMode,
} from './money.ts';

export {
  DISPLAY_TIME_ZONE,
  formatCurrency,
  formatDate,
  formatDepth,
  formatDistance,
  formatDualCurrency,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatTemperature,
  toCairoDateKey,
  type CurrencyOptions,
  type DatePreset,
  type FormatContext,
} from './formatters.ts';

export {
  FSI,
  LRI,
  LRM,
  PDI,
  RLI,
  RLM,
  firstStrongDirection,
  isIsolated,
  isolate,
  isolateIfForeign,
  isolateOnce,
  stripIsolation,
  type IsolationDirection,
} from './bidi.ts';

export { byDirection, directionSign, htmlDir, shouldMirrorIcon } from './direction-core.ts';

export {
  applyDirectionChange,
  getRtlPlatform,
  planDirectionChange,
  registerRtlPlatform,
  type ApplyDirectionOptions,
  type DirectionChangePlan,
  type RtlPlatformAdapter,
} from './rtl-runtime.ts';

export {
  DEFAULT_NAMESPACE,
  buildResources,
  createI18n,
  createI18nSync,
  i18next,
  setLocale,
  type CreateI18nOptions,
  type I18nInstance,
} from './i18n.ts';

// Importing ./react registers the React binding with the i18next factory.
export { Trans, useTranslation, useDirection, useLocale } from './react.ts';
