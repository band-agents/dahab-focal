/**
 * Every user-visible number, price, date, duration and distance is formatted
 * here. Nothing anywhere else calls Intl directly, and nothing ever builds a
 * money string by concatenation (CLAUDE.md).
 */

import { minorUnitExponent, toDecimalString, type CurrencyCode, type Money } from './money';
import type { Locale, NumberingSystem } from './locales';
import { LOCALE_DESCRIPTORS } from './locales';
import { isolate } from './bidi';

/** Everything the app renders is rendered in Egypt's timezone by default. */
export const DISPLAY_TIME_ZONE = 'Africa/Cairo';

export interface FormatContext {
  readonly locale: Locale;
  /** Omit to use the locale's default (Western digits, even in Arabic). */
  readonly numberingSystem?: NumberingSystem;
  readonly timeZone?: string;
}

function resolvedNumberingSystem(context: FormatContext): NumberingSystem {
  return context.numberingSystem ?? LOCALE_DESCRIPTORS[context.locale].defaultNumberingSystem;
}

/**
 * Build the BCP-47 tag with the `-u-nu-` extension, which is how a numbering
 * system is requested: `ar-EG-u-nu-latn` or `ar-EG-u-nu-arab`.
 */
function numericTag(context: FormatContext): string {
  return `${context.locale}-u-nu-${resolvedNumberingSystem(context)}`;
}

/**
 * Intl.NumberFormat v3 accepts a decimal string, which lets money format with
 * zero floating-point involvement. Older engines (notably some Hermes builds)
 * do not, so detect once and fall back to a divided Number, which is still
 * exact at the rounding precision a currency exponent asks for.
 */
const SUPPORTS_STRING_NUMERIC = ((): boolean => {
  try {
    return new Intl.NumberFormat('en').format('1.5' as unknown as number) === '1.5';
  } catch {
    return false;
  }
})();

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function numberFormat(tag: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${tag}|${JSON.stringify(options)}`;
  const cached = numberFormatCache.get(key);
  if (cached !== undefined) return cached;
  const formatter = new Intl.NumberFormat(tag, options);
  numberFormatCache.set(key, formatter);
  return formatter;
}

export interface CurrencyOptions {
  /** `symbol` for prices, `code` for receipts and ledger rows. */
  readonly display?: 'symbol' | 'code' | 'narrowSymbol' | 'name';
  /** Drop the fraction when it is zero — list prices, not invoices. */
  readonly trimZeroFraction?: boolean;
}

export function formatCurrency(
  value: Money,
  context: FormatContext,
  options: CurrencyOptions = {},
): string {
  const exponent = minorUnitExponent(value.currency);
  const showFraction = !(options.trimZeroFraction === true && value.amount % 10 ** exponent === 0);
  const digits = showFraction ? exponent : 0;

  const formatter = numberFormat(numericTag(context), {
    style: 'currency',
    currency: value.currency,
    currencyDisplay: options.display ?? 'symbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  if (SUPPORTS_STRING_NUMERIC) {
    return formatter.format(toDecimalString(value) as unknown as number);
  }
  return formatter.format(value.amount / 10 ** exponent);
}

/**
 * A price quoted in EGP with its EUR equivalent alongside, which is how every
 * price in Dahab Focal is shown to a visitor. Both runs are bidi-isolated so
 * the pair cannot reorder inside an Arabic sentence.
 */
export function formatDualCurrency(
  primary: Money,
  secondary: Money,
  context: FormatContext,
  options: CurrencyOptions = {},
): string {
  const primaryText = isolate(formatCurrency(primary, context, options));
  const secondaryText = isolate(formatCurrency(secondary, context, options));
  return `${primaryText} (${secondaryText})`;
}

export function formatNumber(
  value: number,
  context: FormatContext,
  options: Intl.NumberFormatOptions = {},
): string {
  return numberFormat(numericTag(context), options).format(value);
}

export function formatPercent(
  fraction: number,
  context: FormatContext,
  maximumFractionDigits = 0,
): string {
  return numberFormat(numericTag(context), {
    style: 'percent',
    maximumFractionDigits,
  }).format(fraction);
}

const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function dateFormat(tag: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${tag}|${JSON.stringify(options)}`;
  const cached = dateFormatCache.get(key);
  if (cached !== undefined) return cached;
  const formatter = new Intl.DateTimeFormat(tag, options);
  dateFormatCache.set(key, formatter);
  return formatter;
}

export type DatePreset = 'date' | 'dateShort' | 'time' | 'dateTime' | 'weekdayDate' | 'monthYear';

const DATE_PRESETS: Readonly<Record<DatePreset, Intl.DateTimeFormatOptions>> = {
  date: { day: 'numeric', month: 'long', year: 'numeric' },
  dateShort: { day: '2-digit', month: '2-digit', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  weekdayDate: { weekday: 'long', day: 'numeric', month: 'long' },
  monthYear: { month: 'long', year: 'numeric' },
};

/**
 * Instants are stored UTC and rendered in Africa/Cairo. Egypt reintroduced DST
 * in 2023, so the offset is not a constant — never add hours by hand.
 */
export function formatDate(
  instant: Date,
  context: FormatContext,
  preset: DatePreset = 'date',
): string {
  return dateFormat(numericTag(context), {
    ...DATE_PRESETS[preset],
    timeZone: context.timeZone ?? DISPLAY_TIME_ZONE,
  }).format(instant);
}

/** The calendar day an instant falls on in Cairo, as `YYYY-MM-DD`. */
export function toCairoDateKey(instant: Date, timeZone: string = DISPLAY_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
}

const listFormatCache = new Map<string, Intl.ListFormat>();

function listFormat(tag: string): Intl.ListFormat {
  const cached = listFormatCache.get(tag);
  if (cached !== undefined) return cached;
  const formatter = new Intl.ListFormat(tag, { style: 'narrow', type: 'unit' });
  listFormatCache.set(tag, formatter);
  return formatter;
}

/**
 * Durations, built from Intl unit formatting rather than Intl.DurationFormat,
 * which is not yet available on every engine we ship to (Hermes in
 * particular). A 90-minute dive reads "1 hr 30 min", localised.
 */
export function formatDuration(minutes: number, context: FormatContext): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError(`Duration must be a non-negative number of minutes, got ${minutes}.`);
  }
  const tag = numericTag(context);
  const wholeHours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  const parts: string[] = [];
  if (wholeHours > 0) {
    parts.push(
      numberFormat(tag, { style: 'unit', unit: 'hour', unitDisplay: 'short' }).format(wholeHours),
    );
  }
  if (remainingMinutes > 0 || wholeHours === 0) {
    parts.push(
      numberFormat(tag, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(
        remainingMinutes,
      ),
    );
  }
  return listFormat(tag).format(parts);
}

/** Distances below a kilometre read in metres; above, in kilometres. */
export function formatDistance(metres: number, context: FormatContext): string {
  const tag = numericTag(context);
  if (metres < 1000) {
    return numberFormat(tag, {
      style: 'unit',
      unit: 'meter',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(Math.round(metres));
  }
  return numberFormat(tag, {
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'short',
    maximumFractionDigits: metres < 10_000 ? 1 : 0,
  }).format(metres / 1000);
}

/** Depths, which divers read constantly and which are always metric here. */
export function formatDepth(metres: number, context: FormatContext): string {
  return numberFormat(numericTag(context), {
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(metres);
}

export function formatTemperature(celsius: number, context: FormatContext): string {
  return numberFormat(numericTag(context), {
    style: 'unit',
    unit: 'celsius',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(celsius);
}

const relativeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

/** "in 3 days" / "2 hours ago" — used by expiry warnings and booking states. */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  context: FormatContext,
): string {
  const tag = numericTag(context);
  let formatter = relativeFormatCache.get(tag);
  if (formatter === undefined) {
    formatter = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' });
    relativeFormatCache.set(tag, formatter);
  }
  return formatter.format(value, unit);
}

export type { CurrencyCode, Money };
