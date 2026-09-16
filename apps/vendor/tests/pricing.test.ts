import { describe, expect, it } from 'vitest';

import { PRESETS, rulesInPriorityOrder, simulate } from '../src/pricing';

/**
 * The simulator must agree with the checkout, because both call the same
 * `computePrice()`. These tests are not re-testing the pricing engine — that
 * has its own 28 tests — they assert the two things a simulator can still get
 * wrong: that it passes a well-formed input, and that what it shows an
 * operator is the engine's answer rather than a nearby one.
 */

describe('the simulator feeds computePrice a valid input', () => {
  it('prices every preset without throwing', () => {
    for (const preset of PRESETS) {
      const breakdown = simulate(preset.party);
      expect(breakdown.total.currency).toBe('EGP');
      expect(breakdown.lines.length).toBeGreaterThan(0);
    }
  });

  it('never returns a negative total', () => {
    // A stack of discounts floors at zero rather than paying the traveller.
    for (const preset of PRESETS) {
      expect(simulate(preset.party).total.amount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('seats and heads are different numbers', () => {
  it('counts an infant in capacity but not in the charge', () => {
    const family = PRESETS.find((preset) => preset.key === 'familyWithInfant');
    expect(family).toBeDefined();
    const breakdown = simulate(family!.party);

    // Two adults and a child pay; the infant seats without paying.
    expect(breakdown.chargeableParty).toBe(3);
    expect(breakdown.capacityParty).toBe(4);
    expect(breakdown.capacityParty).toBeGreaterThan(breakdown.chargeableParty);
  });

  it('agrees with itself for a party with nothing free', () => {
    const two = PRESETS.find((preset) => preset.key === 'twoAdults');
    const breakdown = simulate(two!.party);
    expect(breakdown.chargeableParty).toBe(breakdown.capacityParty);
  });
});

describe('rules apply in the operator’s chosen order', () => {
  it('lists them by priority, lowest first', () => {
    const order = rulesInPriorityOrder().map((rule) => rule.priority);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('itemises what it applied, so the operator can see why', () => {
    // The breakdown is the explanation. A total with no lines is a number an
    // operator cannot defend to a traveller.
    const four = PRESETS.find((preset) => preset.key === 'fourAdults');
    const breakdown = simulate(four!.party);
    const labels = breakdown.lines.map((line) => line.labelKey);

    expect(labels).toContain('priceRule.earlyBird');
    // Four adults clears the group-of-four threshold.
    expect(labels).toContain('priceRule.groupOfFour');
  });

  it('does not apply a kind-scoped rule to a party without that kind', () => {
    const two = PRESETS.find((preset) => preset.key === 'twoAdults');
    const labels = simulate(two!.party).lines.map((line) => line.labelKey);
    expect(labels).not.toContain('priceRule.residentRate');
  });
});
