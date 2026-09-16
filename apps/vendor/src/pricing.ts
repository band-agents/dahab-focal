import { computePrice } from '@dahab/api-contract';
import type { PriceBreakdown, PriceInput } from '@dahab/api-contract';

/**
 * The simulator's inputs.
 *
 * Price is computed in exactly one place: `computePrice()` in
 * @dahab/api-contract. This module assembles an input and hands it over — it
 * does not add, discount or round anything itself. The vendor simulator, the
 * traveller checkout and the comparison engine all call the same function, so
 * what an operator sees here is what a traveller will be charged.
 */

/** Two shore dives at The Bells, with the rules Fanous Divers actually runs. */
export const BASE_INPUT: PriceInput = {
  serviceId: '11111111-1111-4111-8111-111111111111',
  model: {
    kind: 'perPerson',
    currency: 'EGP',
    basePrice: { amount: 145_000, currency: 'EGP' },
    tiers: [],
  },
  party: { adult: 2, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
  // Both instants are explicit. `bookedAt` is never Date.now(), so a disputed
  // charge can be reproduced exactly from the stored booking.
  activityAt: new Date('2026-09-18T06:30:00Z'),
  bookedAt: new Date('2026-09-11T09:00:00Z'),
  units: 1,
  itemCount: 1,
  options: [],
  rules: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      labelKey: 'priceRule.earlyBird',
      condition: { kind: 'earlyBird', minDaysAhead: 5 },
      adjustment: { kind: 'percentage', rate: -0.1 },
      priority: 10,
      stackable: true,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      labelKey: 'priceRule.residentRate',
      condition: { kind: 'participantKind', participants: ['resident'] },
      adjustment: { kind: 'percentage', rate: -0.2 },
      priority: 20,
      stackable: true,
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      labelKey: 'priceRule.groupOfFour',
      condition: { kind: 'groupSize', minPartySize: 4 },
      adjustment: { kind: 'fixed', delta: { amount: -30_000, currency: 'EGP' } },
      priority: 30,
      stackable: true,
    },
  ],
  quoteCurrency: 'EGP',
};

export interface PartyPreset {
  readonly key: string;
  readonly party: PriceInput['party'];
}

/**
 * Parties that make the rules visible. The third is the one that matters: a
 * family with an infant pays for three and seats four, so the manifest and the
 * invoice disagree by design.
 */
export const PRESETS: readonly PartyPreset[] = [
  {
    key: 'twoAdults',
    party: { adult: 2, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
  },
  {
    key: 'fourAdults',
    party: { adult: 4, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
  },
  {
    key: 'familyWithInfant',
    party: { adult: 2, child: 1, infant: 1, student: 0, resident: 0, instructor: 0 },
  },
  {
    key: 'residents',
    party: { adult: 0, child: 0, infant: 0, student: 0, resident: 3, instructor: 0 },
  },
];

export function simulate(party: PriceInput['party']): PriceBreakdown {
  return computePrice({ ...BASE_INPUT, party });
}

/** The rules in the order they apply — which is the operator's own choice. */
export function rulesInPriorityOrder(): readonly { id: string; labelKey: string; priority: number }[] {
  return [...(BASE_INPUT.rules ?? [])]
    .map((rule) => ({ id: rule.id, labelKey: rule.labelKey, priority: rule.priority ?? 100 }))
    .sort((a, b) => a.priority - b.priority);
}
