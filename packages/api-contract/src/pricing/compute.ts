import {
  add,
  applyRate,
  money,
  multiply,
  sum,
  toCairoDateKey,
  zero,
  type CurrencyCode,
  type Money,
} from '@dahab/i18n';

import type { IsoWeekday } from '../common.ts';
import {
  PARTICIPANT_RULES,
  priceInputSchema,
  type ParsedPriceInput,
  type ParticipantKind,
  type Party,
  type PriceBreakdown,
  type PriceInput,
  type PriceLine,
  type PricingModel,
  type PricingRule,
  type SelectedOption,
} from './types.ts';

/**
 * computePrice
 *
 * The only place a price is worked out. The vendor-side simulator, the
 * traveler checkout and the comparison engine all call this function; if a
 * second implementation appears anywhere, the two will disagree and the
 * difference will be settled by a refund (CLAUDE.md).
 *
 * It is pure. `bookedAt` is an argument, never `Date.now()`, so a quote can be
 * reproduced exactly from a stored booking — which is what makes a disputed
 * charge answerable.
 */

const PARTICIPANT_KINDS = Object.keys(PARTICIPANT_RULES) as ParticipantKind[];

/**
 * Kinds that are not charged. Derived from PARTICIPANT_RULES so "not charged"
 * and "does not take a seat" can never be collapsed into one flag: an infant
 * and an accompanying instructor are `isChargeable: false` but
 * `occupiesCapacity: true`.
 */
const NON_CHARGEABLE: readonly ParticipantKind[] = PARTICIPANT_KINDS.filter(
  (kind) => !PARTICIPANT_RULES[kind].isChargeable,
);

export function chargeableHeadcount(party: Party): number {
  return PARTICIPANT_KINDS.filter((kind) => PARTICIPANT_RULES[kind].isChargeable).reduce(
    (total, kind) => total + party[kind],
    0,
  );
}

/**
 * Heads that occupy a seat and belong on the manifest. This is the number the
 * availability check and a boat evacuation care about — distinct from
 * `chargeableHeadcount`.
 */
export function capacityHeadcount(party: Party): number {
  return PARTICIPANT_KINDS.filter((kind) => PARTICIPANT_RULES[kind].occupiesCapacity).reduce(
    (total, kind) => total + party[kind],
    0,
  );
}

export function totalHeadcount(party: Party): number {
  return PARTICIPANT_KINDS.reduce((total, kind) => total + party[kind], 0);
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

function assertCurrency(value: Money, expected: CurrencyCode, what: string): void {
  if (value.currency !== expected) {
    throw new PricingError(
      `${what} is priced in ${value.currency} but the quote is in ${expected}. ` +
        'computePrice does no implicit conversion — quote in one currency, or ' +
        'attach a currency-conditioned rule.',
    );
  }
}

/** ISO-8601 weekday (1 Monday … 7 Sunday) for an instant, read in Cairo. */
export function cairoIsoWeekday(instant: Date): IsoWeekday {
  const key = toCairoDateKey(instant);
  // Midday UTC on the Cairo calendar day: far from any DST boundary, so the
  // weekday cannot slip.
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return (day === 0 ? 7 : day) as IsoWeekday;
}

/** Whole days from booking to activity, counted on Cairo calendar days. */
export function daysAhead(bookedAt: Date, activityAt: Date): number {
  const from = Date.parse(`${toCairoDateKey(bookedAt)}T12:00:00Z`);
  const to = Date.parse(`${toCairoDateKey(activityAt)}T12:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export function hoursUntil(bookedAt: Date, activityAt: Date): number {
  return (activityAt.getTime() - bookedAt.getTime()) / 3_600_000;
}

/** The per-person unit price once party-size tiers are taken into account. */
function unitPriceFor(model: PricingModel, headcount: number): Money {
  if (model.kind !== 'perPersonTiered') return model.basePrice;
  const applicable = [...model.tiers]
    .filter((tier) => tier.minPartySize <= headcount)
    .sort((a, b) => b.minPartySize - a.minPartySize)[0];
  return applicable?.unitPrice ?? model.basePrice;
}

function baseLines(input: ParsedPriceInput, headcount: number): PriceLine[] {
  const { model, party, units, quoteCurrency } = input;
  assertCurrency(model.basePrice, quoteCurrency, 'The service base price');

  switch (model.kind) {
    case 'free':
      return [
        {
          kind: 'base',
          labelKey: 'price.free',
          amount: zero(quoteCurrency),
        },
      ];

    case 'perGroup': {
      if (model.maxGroupSize !== undefined && totalHeadcount(party) > model.maxGroupSize) {
        throw new PricingError(
          `This is priced for a group of up to ${model.maxGroupSize}; the party is ` +
            `${totalHeadcount(party)}. Book a second group.`,
        );
      }
      return [
        {
          kind: 'base',
          labelKey: 'price.perGroup',
          amount: model.basePrice,
          detail: `1 x group of ${totalHeadcount(party)}`,
        },
      ];
    }

    case 'perUnitPerDay': {
      const days = `${units} day${units === 1 ? '' : 's'}`;
      // unitBasis is required by the schema for this kind, so it is present.
      switch (model.unitBasis) {
        case 'perItem': {
          const { itemCount } = input;
          return [
            {
              kind: 'base',
              labelKey: 'price.perItem',
              amount: multiply(model.basePrice, itemCount * units),
              detail: `${itemCount} item${itemCount === 1 ? '' : 's'} x ${days}`,
            },
          ];
        }
        case 'perGroup':
          return [
            {
              kind: 'base',
              labelKey: 'price.perGroup',
              amount: multiply(model.basePrice, units),
              detail: `1 x ${days}`,
            },
          ];
        case 'perPerson':
        default:
          return [
            {
              kind: 'base',
              labelKey: 'price.perPerson',
              amount: multiply(model.basePrice, headcount * units),
              detail: `${headcount} x ${days}`,
            },
          ];
      }
    }

    case 'perPerson':
    case 'perPersonTiered': {
      const unit = unitPriceFor(model, headcount);
      assertCurrency(unit, quoteCurrency, 'A party-size tier price');
      // One line per participant kind, so a participantKind rule has
      // something to scope itself to.
      return PARTICIPANT_KINDS.filter(
        (kind) => party[kind] > 0 && !NON_CHARGEABLE.includes(kind),
      ).map((kind) => ({
        kind: 'base' as const,
        labelKey: `participant.${kind}`,
        amount: multiply(unit, party[kind] * units),
        detail: `${party[kind]} x ${kind}`,
      }));
    }
  }
}

function optionLines(options: readonly SelectedOption[], headcount: number, quoteCurrency: CurrencyCode): PriceLine[] {
  return options.map((option) => {
    assertCurrency(option.unitPrice, quoteCurrency, `Option "${option.labelKey}"`);
    const multiplier = option.quantity * (option.perPerson ? headcount : 1);
    return {
      kind: 'option' as const,
      labelKey: option.labelKey,
      amount: multiply(option.unitPrice, multiplier),
      detail: option.perPerson ? `${option.quantity} x ${headcount} people` : `${option.quantity}`,
    };
  });
}

/** Which participant kinds a rule targets, or null when it is not scoped. */
function scopedParticipants(rule: PricingRule): readonly ParticipantKind[] | null {
  return rule.condition.kind === 'participantKind' ? rule.condition.participants : null;
}

function ruleApplies(rule: PricingRule, input: ParsedPriceInput, headcount: number): boolean {
  const { bookedAt, activityAt, party, quoteCurrency } = input;

  if (rule.activeFrom !== undefined && bookedAt < rule.activeFrom) return false;
  if (rule.activeUntil !== undefined && bookedAt > rule.activeUntil) return false;

  switch (rule.condition.kind) {
    case 'always':
      return true;

    case 'seasonal': {
      // Compared on Cairo calendar days. A season that wraps the new year is
      // expressed as two rules rather than being inferred here, so a typo
      // cannot silently invert a range.
      const day = toCairoDateKey(activityAt);
      return day >= rule.condition.startDate && day <= rule.condition.endDate;
    }

    case 'dayOfWeek':
      return rule.condition.weekdays.includes(cairoIsoWeekday(activityAt));

    case 'earlyBird':
      return daysAhead(bookedAt, activityAt) >= rule.condition.minDaysAhead;

    case 'lastMinute': {
      const hours = hoursUntil(bookedAt, activityAt);
      return hours >= 0 && hours <= rule.condition.withinHours;
    }

    case 'participantKind':
      return rule.condition.participants.some((kind) => party[kind] > 0);

    case 'groupSize':
      return headcount >= rule.condition.minPartySize;

    case 'currency':
      return rule.condition.currency === quoteCurrency;
  }
}

/**
 * Sorted so the result never depends on the order rows came back from
 * Postgres: priority first, then rule id as a stable tie-break.
 */
function orderRules(rules: readonly PricingRule[]): PricingRule[] {
  return [...rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export function computePrice(rawInput: PriceInput): PriceBreakdown {
  const input = priceInputSchema.parse(rawInput);
  const currency = input.quoteCurrency;
  const headcount = chargeableHeadcount(input.party);

  if (totalHeadcount(input.party) === 0) {
    throw new PricingError('A booking needs at least one participant.');
  }

  const base = baseLines(input, headcount);
  const options = optionLines(input.options, headcount, currency);
  const lines: PriceLine[] = [...base, ...options];

  const subtotal = sum(
    lines.map((line) => line.amount),
    currency,
  );

  // The amount each participant kind contributes, so a kind-scoped rule can
  // discount only the seats it is about. Taken before any rule runs, so two
  // kind-scoped rules cannot compound on each other by accident.
  const baseByParticipant = new Map<ParticipantKind, Money>();
  for (const kind of PARTICIPANT_KINDS) {
    if (input.party[kind] === 0 || NON_CHARGEABLE.includes(kind)) continue;
    const line = base.find((candidate) => candidate.labelKey === `participant.${kind}`);
    if (line !== undefined) baseByParticipant.set(kind, line.amount);
  }

  let running = subtotal;
  const suppressedRuleIds: PriceBreakdown['suppressedRuleIds'] = [];
  const closedGroups = new Set<string>();

  for (const rule of orderRules(input.rules)) {
    if (!ruleApplies(rule, input, headcount)) continue;

    const group = rule.exclusionGroup ?? rule.id;
    if (closedGroups.has(group)) {
      suppressedRuleIds.push(rule.id);
      continue;
    }

    const participants = scopedParticipants(rule);
    const scope =
      participants === null
        ? running
        : sum(
            participants
              .map((kind) => baseByParticipant.get(kind))
              .filter((value): value is Money => value !== undefined),
            currency,
          );

    let delta: Money;
    let rate: number | undefined;

    switch (rule.adjustment.kind) {
      case 'percentage': {
        rate = rule.adjustment.rate;
        delta = applyRate(scope, rate);
        break;
      }
      case 'fixed': {
        assertCurrency(rule.adjustment.delta, currency, `Rule "${rule.labelKey}"`);
        delta = rule.adjustment.delta;
        break;
      }
      case 'override': {
        assertCurrency(rule.adjustment.price, currency, `Rule "${rule.labelKey}"`);
        // An override replaces the running total, so its line is the
        // difference — the breakdown always sums to the total.
        delta = money(rule.adjustment.price.amount - running.amount, currency);
        break;
      }
    }

    if (delta.amount !== 0 || rule.adjustment.kind === 'override') {
      lines.push({
        kind: 'rule',
        labelKey: rule.labelKey,
        amount: delta,
        ruleId: rule.id,
        ...(rate !== undefined ? { rate } : {}),
        ...(participants !== null ? { detail: participants.join(', ') } : {}),
      });
      running = add(running, delta);
    }

    if (!rule.stackable) closedGroups.add(group);
  }

  // A stack of discounts must never produce a negative charge.
  const total = running.amount < 0 ? zero(currency) : running;

  return {
    subtotal,
    total,
    lines,
    suppressedRuleIds,
    chargeableParty: headcount,
    capacityParty: capacityHeadcount(input.party),
  };
}
