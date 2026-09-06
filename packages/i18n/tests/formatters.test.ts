import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  formatDepth,
  formatDistance,
  formatDualCurrency,
  formatDuration,
  formatNumber,
  toCairoDateKey,
} from '../src/formatters';
import { money } from '../src/money';
import { stripIsolation } from '../src/bidi';

const EGP = money(35_000, 'EGP'); // 350.00 EGP
const EUR = money(650, 'EUR'); // 6.50 EUR

describe('formatCurrency', () => {
  it('formats EGP for an English visitor', () => {
    const output = formatCurrency(EGP, { locale: 'en-GB' });
    expect(output).toContain('350.00');
  });

  it('uses Western digits for Arabic by default, which is the Egyptian norm', () => {
    const output = formatCurrency(EGP, { locale: 'ar-EG' });
    expect(output).toContain('350');
    expect(output).not.toMatch(/[٠-٩]/);
  });

  it('uses Eastern Arabic-Indic digits when the user opts in', () => {
    const output = formatCurrency(EGP, { locale: 'ar-EG', numberingSystem: 'arab' });
    expect(output).toMatch(/[٠-٩]/);
  });

  it('never loses a piastre to floating point', () => {
    // 0.1 + 0.2 in minor units. A float pipeline renders 0.30000000000000004.
    expect(formatCurrency(money(30, 'EGP'), { locale: 'en-GB' })).toContain('0.30');
    expect(formatCurrency(money(1, 'EGP'), { locale: 'en-GB' })).toContain('0.01');
    // 99,999,999 piastres — a large booking, still exact to the piastre.
    expect(formatCurrency(money(99_999_999, 'EGP'), { locale: 'en-GB' })).toContain('999,999.99');
  });

  it('can trim a zero fraction for list prices', () => {
    const trimmed = formatCurrency(EGP, { locale: 'en-GB' }, { trimZeroFraction: true });
    expect(trimmed).not.toContain('.00');
    expect(trimmed).toContain('350');
  });

  it('formats German with a comma decimal separator and trailing symbol', () => {
    const output = formatCurrency(money(35_050, 'EUR'), { locale: 'de-DE' });
    expect(output).toContain('350,50');
  });
});

describe('formatDualCurrency', () => {
  it('quotes EGP with a EUR equivalent', () => {
    const output = formatDualCurrency(EGP, EUR, { locale: 'en-GB' });
    expect(stripIsolation(output)).toMatch(/350\.00.*\(.*6\.50.*\)/);
  });

  it('isolates both runs so they cannot reorder inside Arabic', () => {
    const output = formatDualCurrency(EGP, EUR, { locale: 'ar-EG' });
    // Two isolate/pop pairs: one per amount.
    expect([...output].filter((c) => c === '⁨')).toHaveLength(2);
    expect([...output].filter((c) => c === '⁩')).toHaveLength(2);
  });
});

describe('dates render in Africa/Cairo', () => {
  // 2026-08-15T22:30:00Z. Egypt is on DST (UTC+3) in August, so this instant
  // is already 2026-08-16 in Cairo — the bug a naive UTC render would miss.
  const summerInstant = new Date('2026-08-15T22:30:00Z');
  // 2026-01-15T22:30:00Z. Egypt is UTC+2 in January, so this is still the 16th.
  const winterInstant = new Date('2026-01-15T22:30:00Z');

  it('rolls the calendar day forward across the Cairo offset', () => {
    expect(toCairoDateKey(summerInstant)).toBe('2026-08-16');
    expect(toCairoDateKey(winterInstant)).toBe('2026-01-16');
  });

  it('applies Egyptian DST rather than a fixed offset', () => {
    const summerTime = formatDate(summerInstant, { locale: 'en-GB' }, 'time');
    const winterTime = formatDate(winterInstant, { locale: 'en-GB' }, 'time');
    // Same UTC clock time, one hour apart in Cairo: +3 in August, +2 in January.
    expect(summerTime).toBe('01:30');
    expect(winterTime).toBe('00:30');
  });

  it('formats a long date per locale', () => {
    expect(formatDate(summerInstant, { locale: 'en-GB' })).toBe('16 August 2026');
    expect(formatDate(summerInstant, { locale: 'de-DE' })).toBe('16. August 2026');
  });
});

describe('units', () => {
  it('formats a dive duration', () => {
    expect(formatDuration(90, { locale: 'en-GB' })).toMatch(/1 hr.*30 min/);
    expect(formatDuration(45, { locale: 'en-GB' })).toMatch(/45 min/);
    expect(formatDuration(0, { locale: 'en-GB' })).toMatch(/0 min/);
  });

  it('rejects a negative duration rather than rendering one', () => {
    expect(() => formatDuration(-5, { locale: 'en-GB' })).toThrow(/non-negative/);
  });

  it('switches from metres to kilometres at 1 km', () => {
    expect(formatDistance(850, { locale: 'en-GB' })).toMatch(/850 m/);
    expect(formatDistance(3200, { locale: 'en-GB' })).toMatch(/3\.2 km/);
    expect(formatDistance(42_000, { locale: 'en-GB' })).toMatch(/42 km/);
  });

  it('formats a dive depth', () => {
    // The Blue Hole rim sits at about 6 m; the Arch crosses at about 56 m.
    expect(formatDepth(56, { locale: 'en-GB' })).toMatch(/56 m/);
  });
});

describe('numbers respect the numbering-system preference', () => {
  it('renders Western digits in ar-EG by default and Eastern on request', () => {
    expect(formatNumber(1234, { locale: 'ar-EG' })).toMatch(/1/);
    expect(formatNumber(1234, { locale: 'ar-EG', numberingSystem: 'arab' })).toMatch(
      /[٠-٩]/,
    );
  });
});
