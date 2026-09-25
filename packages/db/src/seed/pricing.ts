import type { Adjustment, RuleCondition } from '@dahab/api-contract';

import {
  CHILD_RATE_BASIS_POINTS,
  PRICE_PER_ADULT_MINOR,
  RESIDENT_RATE_BASIS_POINTS,
  SERVICES,
  STUDENT_RATE_BASIS_POINTS,
} from './operations.ts';

/**
 * The pricing behind the seeded week, as rows `computePrice()` can read.
 *
 * Until this existed, `pricing_models`, `pricing_tiers` and `pricing_rules`
 * held nothing at all — the module map called them seeded, and a count of the
 * live database said 0, 0 and 0. Every booking total in the seed was worked
 * out from `PRICE_PER_ADULT_MINOR` and the three participant rates in
 * `operations.ts`, and none of that reached a table a screen could open.
 *
 * So these are not new prices. They are the same numbers restated in the
 * vocabulary of `@dahab/api-contract`: one per-person model per service, and
 * the child, resident and student rates as participant-scoped percentage
 * rules. `tests/seed-data.test.ts` runs every seeded booking back through
 * `computePrice()` against these rows and requires the total it was charged —
 * so the rate card and the receipts cannot drift apart.
 *
 * The seed charges every service per head, the airport transfer included, and
 * applies one rate table to all of them. This restates that faithfully rather
 * than improving on it: a per-vehicle transfer price or a course with no
 * child rate would be a guess, and a guess on a pricing screen is exactly the
 * placeholder CLAUDE.md rules out.
 */

const CURRENCY = 'EGP';
const BASIS_POINTS = 10_000;

export interface SeedPricingRule {
  /** Stable within a service, so a re-seed replaces rather than duplicates. */
  readonly key: string;
  readonly labelKey: string;
  readonly condition: RuleCondition;
  readonly adjustment: Adjustment;
  readonly priority: number;
  readonly stackable: boolean;
}

export interface SeedPricing {
  readonly serviceSlug: string;
  readonly kind: 'perPerson';
  readonly currency: typeof CURRENCY;
  readonly basePriceMinor: number;
  readonly rules: readonly SeedPricingRule[];
}

/** 7000 basis points of the adult price is a 30% reduction: rate -0.3. */
function reductionFrom(basisPoints: number): number {
  return (basisPoints - BASIS_POINTS) / BASIS_POINTS;
}

const PARTICIPANT_RATES: readonly SeedPricingRule[] = [
  {
    key: 'child',
    labelKey: 'priceRule.childRate',
    condition: { kind: 'participantKind', participants: ['child'] },
    adjustment: { kind: 'percentage', rate: reductionFrom(CHILD_RATE_BASIS_POINTS) },
    priority: 100,
    stackable: true,
  },
  {
    key: 'resident',
    labelKey: 'priceRule.residentRate',
    condition: { kind: 'participantKind', participants: ['resident'] },
    adjustment: { kind: 'percentage', rate: reductionFrom(RESIDENT_RATE_BASIS_POINTS) },
    priority: 100,
    stackable: true,
  },
  {
    key: 'student',
    labelKey: 'priceRule.studentRate',
    condition: { kind: 'participantKind', participants: ['student'] },
    adjustment: { kind: 'percentage', rate: reductionFrom(STUDENT_RATE_BASIS_POINTS) },
    priority: 100,
    stackable: true,
  },
];

export const SEED_PRICING: readonly SeedPricing[] = SERVICES.map((service) => {
  const basePriceMinor = PRICE_PER_ADULT_MINOR[service.slug];
  if (basePriceMinor === undefined) {
    throw new Error(`No adult price for service ${service.slug}`);
  }
  return {
    serviceSlug: service.slug,
    kind: 'perPerson' as const,
    currency: CURRENCY,
    basePriceMinor,
    rules: PARTICIPANT_RATES,
  };
});
