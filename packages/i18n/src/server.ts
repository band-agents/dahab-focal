/**
 * @dahab/i18n/server — the React-free surface.
 *
 * Everything a React Server Component, the tRPC API or a Node script needs:
 * locales, direction, money, the formatters, bidi isolation and a translator.
 * Nothing here imports `react-i18next`, whose module body calls
 * `createContext()` on import and throws outside a client bundle.
 *
 * The one thing missing compared with the main entry is the hooks — a server
 * component knows its locale from the route, so it has no use for them.
 */

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
  DEFAULT_NAMESPACE,
  buildResources,
  createI18n,
  createI18nSync,
  i18next,
  setLocale,
  type CreateI18nOptions,
  type I18nInstance,
} from './i18n.ts';
