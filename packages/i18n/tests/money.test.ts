import { describe, expect, it } from 'vitest';

import {
  add,
  applyRate,
  fromDecimalString,
  money,
  multiply,
  roundMinor,
  subtract,
  sum,
  toDecimalString,
  zero,
} from '../src/money';

describe('Money is integer minor units', () => {
  it('rejects a float outright', () => {
    expect(() => money(350.5, 'EGP')).toThrow(/safe integer/);
    expect(() => money(0.1 + 0.2, 'EGP')).toThrow();
  });

  it('rejects a non-integer quantity', () => {
    expect(() => multiply(money(35_000, 'EGP'), 2.5)).toThrow(/integer/);
  });

  it('refuses to add across currencies without an FX rate', () => {
    expect(() => add(money(35_000, 'EGP'), money(1200, 'EUR'))).toThrow(/EGP with EUR/);
  });

  it('adds and subtracts exactly, with no float drift', () => {
    // The classic 0.1 + 0.2 case, in piastres: 10 + 20 must be exactly 30.
    const total = sum([money(10, 'EGP'), money(20, 'EGP')], 'EGP');
    expect(total).toEqual({ amount: 30, currency: 'EGP' });
    expect(subtract(total, money(30, 'EGP'))).toEqual(zero('EGP'));
  });

  it('round-trips through a decimal string without floating point', () => {
    expect(toDecimalString(money(35_000, 'EGP'))).toBe('350.00');
    expect(toDecimalString(money(5, 'EGP'))).toBe('0.05');
    expect(toDecimalString(money(-12_345, 'EGP'))).toBe('-123.45');
    expect(fromDecimalString('350.50', 'EGP')).toEqual({ amount: 35_050, currency: 'EGP' });
    expect(fromDecimalString('350', 'EGP')).toEqual({ amount: 35_000, currency: 'EGP' });
    expect(fromDecimalString('-123.45', 'EGP')).toEqual({ amount: -12_345, currency: 'EGP' });
  });

  it('rejects anything that is not a plain decimal', () => {
    expect(() => fromDecimalString('350 EGP', 'EGP')).toThrow();
    expect(() => fromDecimalString('1,350.00', 'EGP')).toThrow();
  });
});

describe('rounding', () => {
  it('rounds a tie away from zero so refunds are not skewed', () => {
    // Math.round(-0.5) is -0, which would systematically shave refunds.
    expect(roundMinor(2.5)).toBe(3);
    expect(roundMinor(-2.5)).toBe(-3);
    expect(roundMinor(2.4)).toBe(2);
    expect(roundMinor(-2.4)).toBe(-2);
  });

  it('applies a rate and lands on whole minor units', () => {
    // 10% off 349.99 EGP.
    const discounted = applyRate(money(34_999, 'EGP'), 0.9);
    expect(Number.isInteger(discounted.amount)).toBe(true);
    expect(discounted.amount).toBe(31_499);
  });

  it('supports floor and ceil for the cases that need them', () => {
    expect(applyRate(money(101, 'EGP'), 0.5, 'floor').amount).toBe(50);
    expect(applyRate(money(101, 'EGP'), 0.5, 'ceil').amount).toBe(51);
  });
});
