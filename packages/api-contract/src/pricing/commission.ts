/**
 * What the platform and the payment providers keep.
 *
 * Here rather than in the seed, because three places now need the same
 * answer: the seed that writes an operating week, the refund path that has to
 * give the commission back, and the money screen that shows what is owed. Two
 * implementations of a take rate is how a vendor gets paid a different number
 * from the one the console showed them.
 *
 * Basis points throughout — a take rate as `0.12` is a float, and a float is
 * how a piastre goes missing on every hundredth booking.
 */

/** Egypt keeps a 12% take rate. */
export const TAKE_RATE_BASIS_POINTS = 1200;

/** What the payment providers keep. */
export const PAYMENT_FEE_BASIS_POINTS = 250;

const BASIS_POINTS = 10_000;

/** The platform's cut of a gross amount, rounded to whole piastres. */
export function commissionMinor(grossMinor: number): number {
  return Math.round((grossMinor * TAKE_RATE_BASIS_POINTS) / BASIS_POINTS);
}

/** The provider's cut of a captured amount, rounded to whole piastres. */
export function paymentFeeMinor(grossMinor: number): number {
  return Math.round((grossMinor * PAYMENT_FEE_BASIS_POINTS) / BASIS_POINTS);
}
