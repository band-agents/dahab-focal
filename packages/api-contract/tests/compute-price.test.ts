import { describe, expect, it } from 'vitest';

import {
  PricingError,
  cairoIsoWeekday,
  chargeableHeadcount,
  computePrice,
  daysAhead,
  type PriceInput,
  type PricingRuleInput,
} from '../src/pricing';

/**
 * Real Dahab numbers. A two-tank fun dive at Fanous Divers is 1,400 EGP;
 * the Blue Hole day trip and the Ras Abu Galum camel-and-snorkel run are the
 * other two shapes an operator here actually quotes in.
 */

const EGP = (major: number) => ({ amount: Math.round(major * 100), currency: 'EGP' as const });

/** 2026-03-19 is a Thursday in Cairo; 2026-03-20 a Friday (Egyptian weekend). */
const THURSDAY = new Date('2026-03-19T06:00:00Z');
const FRIDAY = new Date('2026-03-20T06:00:00Z');

const SERVICE_ID = '018f3a4b-0000-7000-8000-000000000001';
const rule = (
  overrides: Partial<PricingRuleInput> &
    Pick<PricingRuleInput, 'id' | 'labelKey' | 'condition' | 'adjustment'>,
): PricingRuleInput => ({
  priority: 100,
  stackable: true,
  ...overrides,
});

function baseInput(overrides: Partial<PriceInput> = {}): PriceInput {
  return {
    serviceId: SERVICE_ID,
    quoteCurrency: 'EGP',
    model: {
      kind: 'perPerson',
      currency: 'EGP',
      basePrice: EGP(1400),
      tiers: [],
    },
    party: { adult: 2, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
    activityAt: THURSDAY,
    bookedAt: new Date('2026-03-18T09:00:00Z'),
    units: 1,
    options: [],
    rules: [],
    ...overrides,
  };
}

describe('the party', () => {
  it('does not charge infants or accompanying instructors', () => {
    const result = computePrice(
      baseInput({
        party: { adult: 2, child: 1, infant: 1, student: 0, resident: 0, instructor: 1 },
      }),
    );
    expect(chargeableHeadcount({ adult: 2, child: 1, infant: 1, student: 0, resident: 0, instructor: 1 })).toBe(3);
    expect(result.chargeableParty).toBe(3);
    expect(result.total).toEqual(EGP(4200));
  });

  it('refuses an empty party rather than quoting zero', () => {
    expect(() =>
      computePrice(
        baseInput({
          party: { adult: 0, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
        }),
      ),
    ).toThrow(PricingError);
  });
});

describe('pricing models', () => {
  it('perPerson multiplies by the chargeable head count', () => {
    expect(computePrice(baseInput()).total).toEqual(EGP(2800));
  });

  it('perGroup charges once, whatever the party size', () => {
    const input = baseInput({
      model: { kind: 'perGroup', currency: 'EGP', basePrice: EGP(6500), tiers: [], maxGroupSize: 6 },
      party: { adult: 4, child: 2, infant: 0, student: 0, resident: 0, instructor: 0 },
    });
    expect(computePrice(input).total).toEqual(EGP(6500));
  });

  it('perGroup refuses a party larger than the boat', () => {
    const input = baseInput({
      model: { kind: 'perGroup', currency: 'EGP', basePrice: EGP(6500), tiers: [], maxGroupSize: 6 },
      party: { adult: 7, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
    });
    expect(() => computePrice(input)).toThrow(/group of up to 6/);
  });

  it('perPersonTiered takes the best tier the party qualifies for', () => {
    const model = {
      kind: 'perPersonTiered' as const,
      currency: 'EGP' as const,
      basePrice: EGP(1400),
      tiers: [
        { minPartySize: 4, unitPrice: EGP(1150) },
        { minPartySize: 2, unitPrice: EGP(1250) },
      ],
    };
    const two = computePrice(baseInput({ model })).total;
    const four = computePrice(
      baseInput({
        model,
        party: { adult: 4, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
      }),
    ).total;
    const solo = computePrice(
      baseInput({
        model,
        party: { adult: 1, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
      }),
    ).total;

    expect(two).toEqual(EGP(2500));
    expect(four).toEqual(EGP(4600));
    expect(solo).toEqual(EGP(1400));
  });

  it('perUnitPerDay multiplies by people and days', () => {
    // A full kit rental at 350 EGP per person per day, two people, three days.
    const input = baseInput({
      model: { kind: 'perUnitPerDay', currency: 'EGP', basePrice: EGP(350), tiers: [] },
      units: 3,
    });
    expect(computePrice(input).total).toEqual(EGP(2100));
  });

  it('free is free', () => {
    const input = baseInput({
      model: { kind: 'free', currency: 'EGP', basePrice: EGP(0), tiers: [] },
    });
    expect(computePrice(input).total).toEqual(EGP(0));
  });
});

describe('options', () => {
  it('multiplies per-person options by the party and per-booking options once', () => {
    const result = computePrice(
      baseInput({
        options: [
          {
            optionId: '018f3a4b-0000-7000-8000-00000000000a',
            labelKey: 'option.nitrox',
            unitPrice: EGP(150),
            quantity: 1,
            perPerson: true,
          },
          {
            optionId: '018f3a4b-0000-7000-8000-00000000000b',
            labelKey: 'option.privateGuide',
            unitPrice: EGP(900),
            quantity: 1,
            perPerson: false,
          },
        ],
      }),
    );
    // 2 x 1400 + 2 x 150 + 900
    expect(result.subtotal).toEqual(EGP(4000));
    expect(result.total).toEqual(EGP(4000));
  });
});

describe('rule conditions', () => {
  const tenPercentOff = (condition: PricingRuleInput['condition'], id = '018f3a4b-0000-7000-8000-000000000101') =>
    rule({ id, labelKey: 'rule.test', condition, adjustment: { kind: 'percentage', rate: -0.1 } });

  it('reads day-of-week in Cairo, where Friday is the weekend', () => {
    expect(cairoIsoWeekday(THURSDAY)).toBe(4);
    expect(cairoIsoWeekday(FRIDAY)).toBe(5);

    const weekendSurcharge = rule({
      id: '018f3a4b-0000-7000-8000-000000000102',
      labelKey: 'rule.weekend',
      condition: { kind: 'dayOfWeek', weekdays: [5, 6] },
      adjustment: { kind: 'percentage', rate: 0.15 },
    });

    expect(computePrice(baseInput({ rules: [weekendSurcharge] })).total).toEqual(EGP(2800));
    expect(
      computePrice(baseInput({ activityAt: FRIDAY, rules: [weekendSurcharge] })).total,
    ).toEqual(EGP(3220));
  });

  it('counts early-bird days on Cairo calendar days', () => {
    // 22:00 UTC on 1 February is already 2 February in Cairo, so this is 45
    // days ahead and not 46 — the reason day counts are not done in UTC.
    const bookedAt = new Date('2026-02-01T22:00:00Z');
    expect(daysAhead(bookedAt, THURSDAY)).toBe(45);

    const early = tenPercentOff({ kind: 'earlyBird', minDaysAhead: 30 });
    expect(computePrice(baseInput({ bookedAt, rules: [early] })).total).toEqual(EGP(2520));
    // Booked the day before: no discount.
    expect(computePrice(baseInput({ rules: [early] })).total).toEqual(EGP(2800));
  });

  it('fires last-minute only inside the window and never after departure', () => {
    const lastMinute = tenPercentOff({ kind: 'lastMinute', withinHours: 24 });
    const justInside = new Date('2026-03-18T10:00:00Z'); // 20 h before
    const tooEarly = new Date('2026-03-16T06:00:00Z'); // 72 h before
    const afterDeparture = new Date('2026-03-19T08:00:00Z');

    expect(computePrice(baseInput({ bookedAt: justInside, rules: [lastMinute] })).total).toEqual(
      EGP(2520),
    );
    expect(computePrice(baseInput({ bookedAt: tooEarly, rules: [lastMinute] })).total).toEqual(
      EGP(2800),
    );
    expect(
      computePrice(baseInput({ bookedAt: afterDeparture, rules: [lastMinute] })).total,
    ).toEqual(EGP(2800));
  });

  it('applies a seasonal rate on Cairo calendar days, inclusive at both ends', () => {
    const highSeason = rule({
      id: '018f3a4b-0000-7000-8000-000000000103',
      labelKey: 'rule.highSeason',
      condition: { kind: 'seasonal', startDate: '2026-03-01', endDate: '2026-03-19' },
      adjustment: { kind: 'percentage', rate: 0.2 },
    });
    expect(computePrice(baseInput({ rules: [highSeason] })).total).toEqual(EGP(3360));
    // The 20th is outside the range.
    expect(computePrice(baseInput({ activityAt: FRIDAY, rules: [highSeason] })).total).toEqual(
      EGP(2800),
    );
  });

  it('discounts only the seats a participant-kind rule targets', () => {
    const childRate = rule({
      id: '018f3a4b-0000-7000-8000-000000000104',
      labelKey: 'rule.childRate',
      condition: { kind: 'participantKind', participants: ['child'] },
      adjustment: { kind: 'percentage', rate: -0.5 },
    });
    const result = computePrice(
      baseInput({
        party: { adult: 2, child: 2, infant: 0, student: 0, resident: 0, instructor: 0 },
        rules: [childRate],
      }),
    );
    // 4 x 1400 = 5600, less 50% of the 2800 the two children contribute.
    expect(result.subtotal).toEqual(EGP(5600));
    expect(result.total).toEqual(EGP(4200));
  });

  it('fires a group-size rule on the chargeable head count', () => {
    const groupRate = tenPercentOff({ kind: 'groupSize', minPartySize: 4 });
    // Three payers plus an infant: the infant does not tip it over the line.
    expect(
      computePrice(
        baseInput({
          party: { adult: 3, child: 0, infant: 1, student: 0, resident: 0, instructor: 0 },
          rules: [groupRate],
        }),
      ).total,
    ).toEqual(EGP(4200));

    expect(
      computePrice(
        baseInput({
          party: { adult: 4, child: 0, infant: 0, student: 0, resident: 0, instructor: 0 },
          rules: [groupRate],
        }),
      ).total,
    ).toEqual(EGP(5040));
  });

  it('honours the active window on the rule itself', () => {
    const expired = rule({
      id: '018f3a4b-0000-7000-8000-000000000105',
      labelKey: 'rule.launchOffer',
      condition: { kind: 'always' },
      adjustment: { kind: 'percentage', rate: -0.25 },
      activeUntil: new Date('2026-01-31T21:59:59Z'),
    });
    expect(computePrice(baseInput({ rules: [expired] })).total).toEqual(EGP(2800));
  });
});

describe('stacking, priority and exclusion', () => {
  it('compounds percentages in priority order, and order changes the answer', () => {
    const tenOff = rule({
      id: '018f3a4b-0000-7000-8000-000000000201',
      labelKey: 'rule.ten',
      condition: { kind: 'always' },
      adjustment: { kind: 'percentage', rate: -0.1 },
      priority: 10,
    });
    const fixedOff = rule({
      id: '018f3a4b-0000-7000-8000-000000000202',
      labelKey: 'rule.voucher',
      condition: { kind: 'always' },
      adjustment: { kind: 'fixed', delta: EGP(-300) },
      priority: 20,
    });

    // 2800 -> -280 -> 2520 -> -300 -> 2220
    expect(computePrice(baseInput({ rules: [tenOff, fixedOff] })).total).toEqual(EGP(2220));

    // Swap the priorities: 2800 -> -300 -> 2500 -> -250 -> 2250.
    const swapped = computePrice(
      baseInput({
        rules: [
          { ...tenOff, priority: 20 },
          { ...fixedOff, priority: 10 },
        ],
      }),
    );
    expect(swapped.total).toEqual(EGP(2250));
  });

  it('is deterministic when two rules share a priority', () => {
    const a = rule({
      id: '018f3a4b-0000-7000-8000-00000000020a',
      labelKey: 'rule.a',
      condition: { kind: 'always' },
      adjustment: { kind: 'percentage', rate: -0.1 },
    });
    const b = rule({
      id: '018f3a4b-0000-7000-8000-00000000020b',
      labelKey: 'rule.b',
      condition: { kind: 'always' },
      adjustment: { kind: 'fixed', delta: EGP(-100) },
    });
    const forwards = computePrice(baseInput({ rules: [a, b] }));
    const backwards = computePrice(baseInput({ rules: [b, a] }));
    expect(forwards.total).toEqual(backwards.total);
    expect(forwards.lines.map((line) => line.labelKey)).toEqual(
      backwards.lines.map((line) => line.labelKey),
    );
  });

  it('lets a non-stackable rule close its exclusion group', () => {
    const seasonal = rule({
      id: '018f3a4b-0000-7000-8000-000000000203',
      labelKey: 'rule.highSeason',
      condition: { kind: 'always' },
      adjustment: { kind: 'percentage', rate: 0.2 },
      priority: 10,
      stackable: false,
      exclusionGroup: 'season',
    });
    const competingSeasonal = rule({
      id: '018f3a4b-0000-7000-8000-000000000204',
      labelKey: 'rule.shoulderSeason',
      condition: { kind: 'always' },
      adjustment: { kind: 'percentage', rate: 0.1 },
      priority: 20,
      stackable: false,
      exclusionGroup: 'season',
    });

    const result = computePrice(baseInput({ rules: [seasonal, competingSeasonal] }));
    expect(result.total).toEqual(EGP(3360));
    expect(result.suppressedRuleIds).toEqual([competingSeasonal.id]);
  });

  it('replaces the total with an override and still balances the breakdown', () => {
    const override = rule({
      id: '018f3a4b-0000-7000-8000-000000000205',
      labelKey: 'rule.eurRate',
      condition: { kind: 'currency', currency: 'EGP' },
      adjustment: { kind: 'override', price: EGP(2000) },
      priority: 50,
    });
    const result = computePrice(baseInput({ rules: [override] }));
    expect(result.total).toEqual(EGP(2000));

    const summed = result.lines.reduce((total, line) => total + line.amount.amount, 0);
    expect(summed).toBe(result.total.amount);
  });

  it('skips a currency rule that is not the quote currency', () => {
    const eurOnly = rule({
      id: '018f3a4b-0000-7000-8000-000000000206',
      labelKey: 'rule.eurRate',
      condition: { kind: 'currency', currency: 'EUR' },
      adjustment: { kind: 'override', price: { amount: 5000, currency: 'EUR' } },
    });
    expect(computePrice(baseInput({ rules: [eurOnly] })).total).toEqual(EGP(2800));
  });

  it('never lets a stack of discounts produce a negative charge', () => {
    const huge = rule({
      id: '018f3a4b-0000-7000-8000-000000000207',
      labelKey: 'rule.voucher',
      condition: { kind: 'always' },
      adjustment: { kind: 'fixed', delta: EGP(-5000) },
    });
    expect(computePrice(baseInput({ rules: [huge] })).total).toEqual(EGP(0));
  });
});

describe('the breakdown is an explanation, not a number', () => {
  it('sums exactly to the total so vendor and traveler see the same arithmetic', () => {
    const result = computePrice(
      baseInput({
        party: { adult: 2, child: 1, infant: 0, student: 1, resident: 0, instructor: 0 },
        options: [
          {
            optionId: '018f3a4b-0000-7000-8000-00000000000a',
            labelKey: 'option.nitrox',
            unitPrice: EGP(150),
            quantity: 1,
            perPerson: true,
          },
        ],
        rules: [
          rule({
            id: '018f3a4b-0000-7000-8000-000000000301',
            labelKey: 'rule.studentRate',
            condition: { kind: 'participantKind', participants: ['student'] },
            adjustment: { kind: 'percentage', rate: -0.2 },
            priority: 10,
          }),
          rule({
            id: '018f3a4b-0000-7000-8000-000000000302',
            labelKey: 'rule.groupOfFour',
            condition: { kind: 'groupSize', minPartySize: 4 },
            adjustment: { kind: 'percentage', rate: -0.05 },
            priority: 20,
          }),
        ],
      }),
    );

    const summed = result.lines.reduce((total, line) => total + line.amount.amount, 0);
    expect(summed).toBe(result.total.amount);
    expect(result.lines.filter((line) => line.kind === 'base')).toHaveLength(3);
    expect(result.lines.filter((line) => line.kind === 'rule')).toHaveLength(2);
    expect(result.total.amount % 1).toBe(0);
  });

  it('records the rate on percentage lines so the UI can say "-10%"', () => {
    const result = computePrice(
      baseInput({
        rules: [
          rule({
            id: '018f3a4b-0000-7000-8000-000000000303',
            labelKey: 'rule.ten',
            condition: { kind: 'always' },
            adjustment: { kind: 'percentage', rate: -0.1 },
          }),
        ],
      }),
    );
    const ruleLine = result.lines.find((line) => line.kind === 'rule');
    expect(ruleLine?.rate).toBe(-0.1);
  });
});

describe('currency discipline', () => {
  it('refuses to mix currencies rather than converting silently', () => {
    expect(() =>
      computePrice(
        baseInput({
          options: [
            {
              optionId: '018f3a4b-0000-7000-8000-00000000000a',
              labelKey: 'option.nitrox',
              unitPrice: { amount: 500, currency: 'EUR' },
              quantity: 1,
              perPerson: false,
            },
          ],
        }),
      ),
    ).toThrow(/no implicit conversion/);
  });

  it('rejects a float price at the boundary', () => {
    expect(() =>
      computePrice(
        baseInput({
          model: {
            kind: 'perPerson',
            currency: 'EGP',
            basePrice: { amount: 1400.5, currency: 'EGP' },
            tiers: [],
          },
        }),
      ),
    ).toThrow();
  });
});
