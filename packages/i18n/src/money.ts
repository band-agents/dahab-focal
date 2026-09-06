/**
 * Money is an integer count of minor units plus an ISO-4217 code. Never a
 * float, never a Postgres `money`, never a string built by hand (CLAUDE.md).
 *
 * 350 EGP is `{ amount: 35000, currency: 'EGP' }` — thirty-five thousand
 * piastres.
 */

export interface Money {
  /** Integer minor units. Negative means a credit / refund. */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export const CURRENCIES = ['EGP', 'EUR', 'USD', 'GBP'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

/**
 * ISO-4217 minor-unit exponents for the currencies we actually quote in.
 * Held explicitly rather than derived, because a wrong exponent is a
 * hundred-fold pricing bug and should be reviewable in a diff.
 */
const MINOR_UNIT_EXPONENT: Readonly<Record<CurrencyCode, number>> = {
  EGP: 2,
  EUR: 2,
  USD: 2,
  GBP: 2,
};

export function minorUnitExponent(currency: CurrencyCode): number {
  return MINOR_UNIT_EXPONENT[currency];
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError(
      `Money.amount must be a safe integer count of minor units, received ${String(amount)}. ` +
        'A float here is a rounding bug waiting to be reconciled.',
    );
  }
  return { amount, currency };
}

export const zero = (currency: CurrencyCode): Money => ({ amount: 0, currency });

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Cannot combine ${a.currency} with ${b.currency} without an FX rate.`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function sum(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce<Money>((acc, item) => add(acc, item), zero(currency));
}

/**
 * Multiply by an integer quantity. Party sizes and night counts are integers;
 * anything fractional belongs in {@link applyRate}.
 */
export function multiply(value: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity)) {
    throw new TypeError(`Quantity must be an integer, received ${String(quantity)}.`);
  }
  return money(value.amount * quantity, value.currency);
}

export type RoundingMode = 'half-up' | 'floor' | 'ceil';

/**
 * Apply a percentage or multiplier and round back to whole minor units.
 * Every discount, surcharge and commission goes through here so rounding
 * happens in exactly one place and is auditable.
 */
export function applyRate(value: Money, rate: number, mode: RoundingMode = 'half-up'): Money {
  if (!Number.isFinite(rate)) {
    throw new TypeError(`Rate must be finite, received ${String(rate)}.`);
  }
  const raw = value.amount * rate;
  return money(roundMinor(raw, mode), value.currency);
}

export function roundMinor(raw: number, mode: RoundingMode = 'half-up'): number {
  switch (mode) {
    case 'floor':
      return Math.floor(raw);
    case 'ceil':
      return Math.ceil(raw);
    case 'half-up':
      // Math.round is half-up towards +Infinity, which skews negative
      // amounts (refunds). Round away from zero on a tie instead.
      return raw < 0 ? -Math.round(-raw) : Math.round(raw);
  }
}

export function isZero(value: Money): boolean {
  return value.amount === 0;
}

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
}

/**
 * Exact decimal representation, no floating point involved. Used for the
 * formatter fast path and for anything that must round-trip through a
 * database or a payment gateway.
 */
export function toDecimalString(value: Money): string {
  const exponent = MINOR_UNIT_EXPONENT[value.currency];
  const negative = value.amount < 0;
  const digits = Math.abs(value.amount).toString().padStart(exponent + 1, '0');
  if (exponent === 0) return `${negative ? '-' : ''}${digits}`;
  const whole = digits.slice(0, digits.length - exponent);
  const fraction = digits.slice(digits.length - exponent);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** Parse a human-entered decimal ("350", "350.50") into minor units. */
export function fromDecimalString(input: string, currency: CurrencyCode): Money {
  const trimmed = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new TypeError(`"${input}" is not a plain decimal amount.`);
  }
  const exponent = MINOR_UNIT_EXPONENT[currency];
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const padded = (fraction + '0'.repeat(exponent)).slice(0, exponent);
  const minor = Number(whole) * 10 ** exponent + Number(padded || '0');
  return money(negative ? -minor : minor, currency);
}
