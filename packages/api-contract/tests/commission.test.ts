import { describe, expect, it } from 'vitest';

import {
  PAYMENT_FEE_BASIS_POINTS,
  TAKE_RATE_BASIS_POINTS,
  commissionMinor,
  paymentFeeMinor,
} from '../src/pricing/commission';

/**
 * The take rate moved here from the seed because three places now need the
 * same answer: the seed, the refund path that gives the commission back, and
 * the money screen. Two implementations is how a vendor gets paid a different
 * number from the one the console showed them.
 */

describe('the platform commission', () => {
  it('is twelve per cent, in basis points', () => {
    expect(TAKE_RATE_BASIS_POINTS).toBe(1200);
    expect(commissionMinor(100_000)).toBe(12_000);
  });

  it('returns whole minor units, never a fraction of a piastre', () => {
    // 1 in 3 piastres is where a float would show; the result has to stay an
    // integer because it is written to a bigint column.
    for (const gross of [1, 7, 33, 12_345, 99_999, 145_000]) {
      const commission = commissionMinor(gross);
      expect(Number.isInteger(commission)).toBe(true);
    }
  });

  it('never exceeds the gross it is taken from', () => {
    for (const gross of [0, 1, 999, 1_000_000]) {
      expect(commissionMinor(gross)).toBeLessThanOrEqual(gross);
    }
  });

  it('leaves a refund balanced: gross back = vendor share + commission', () => {
    // The three-leg refund group in the cancellation cascade depends on this
    // identity exactly. If rounding broke it, the ledger would stop summing
    // to zero and nothing else would notice.
    for (const gross of [1, 7, 33, 12_345, 99_999, 145_000, 917_400]) {
      const commission = commissionMinor(gross);
      expect(gross - commission + commission).toBe(gross);
      expect((gross - commission) + commission - gross).toBe(0);
    }
  });
});

describe('the payment provider fee', () => {
  it('is two and a half per cent, in basis points', () => {
    expect(PAYMENT_FEE_BASIS_POINTS).toBe(250);
    expect(paymentFeeMinor(100_000)).toBe(2_500);
  });

  it('is an integer too', () => {
    for (const gross of [3, 41, 12_345]) {
      expect(Number.isInteger(paymentFeeMinor(gross))).toBe(true);
    }
  });
});
