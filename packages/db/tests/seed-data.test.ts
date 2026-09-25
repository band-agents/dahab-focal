import { describe, expect, it } from 'vitest';

import {
  CATEGORY_SLUGS,
  attributeDefinitionSchema,
  computePrice,
  pointSchema,
  pricingModelSchema,
  pricingRuleSchema,
  type PricingRuleInput,
} from '@dahab/api-contract';

import { CATEGORY_ATTRIBUTES, DIVING_INCLUSIONS } from '../src/seed/attributes';
import {
  CATEGORIES,
  DIVE_SITES,
  NEIGHBORHOODS,
  SEED_TODAY,
  VENDORS,
  inDays,
} from '../src/seed/dahab';
import { BOOKINGS, SERVICES } from '../src/seed/operations';
import { SEED_PRICING } from '../src/seed/pricing';

/**
 * The seed is content, so it gets the same treatment as content: validated
 * against the contract schemas, and checked for the specific mistakes that
 * would make it wrong rather than merely unusual.
 */

/** Dahab sits in a narrow box on the Gulf of Aqaba coast. */
const DAHAB_BOUNDS = {
  minLatitude: 28.35,
  maxLatitude: 28.8,
  minLongitude: 34.4,
  maxLongitude: 34.65,
};

function assertInDahab(name: string, latitude: number, longitude: number): void {
  expect(pointSchema.safeParse({ latitude, longitude }).success).toBe(true);
  expect(latitude, `${name} latitude`).toBeGreaterThan(DAHAB_BOUNDS.minLatitude);
  expect(latitude, `${name} latitude`).toBeLessThan(DAHAB_BOUNDS.maxLatitude);
  expect(longitude, `${name} longitude`).toBeGreaterThan(DAHAB_BOUNDS.minLongitude);
  expect(longitude, `${name} longitude`).toBeLessThan(DAHAB_BOUNDS.maxLongitude);
}

describe('categories', () => {
  it('covers exactly the twelve the contract declares', () => {
    expect(CATEGORIES.map((category) => category.slug).sort()).toEqual(
      [...CATEGORY_SLUGS].sort(),
    );
  });

  it('names a colour token, never a literal colour', () => {
    for (const category of CATEGORIES) {
      expect(category.colorToken).not.toMatch(/^#/);
      expect(category.colorToken).not.toMatch(/rgb|hsl/i);
    }
  });

  it('gives every category an attribute schema', () => {
    for (const category of CATEGORIES) {
      const attributes = CATEGORY_ATTRIBUTES[category.slug];
      expect(attributes, `${category.slug} has no attributes`).toBeDefined();
      expect(attributes?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('the diving attribute schema', () => {
  it('carries a 25-row inclusions matrix', () => {
    expect(DIVING_INCLUSIONS).toHaveLength(25);
    for (const inclusion of DIVING_INCLUSIONS) {
      expect(inclusion.dataType).toBe('boolean');
      expect(inclusion.comparisonGroup).toBe('inclusions');
      expect(inclusion.isComparable).toBe(true);
    }
    // Every row occupies its own slot in the comparison order.
    const orders = DIVING_INCLUSIONS.map((inclusion) => inclusion.comparisonOrder);
    expect(new Set(orders).size).toBe(25);
  });

  it('normalises the units two vendors would disagree about', () => {
    const diving = CATEGORY_ATTRIBUTES['scuba-diving'] ?? [];
    const depth = diving.find((attribute) => attribute.key === 'max_depth_m');
    const bottomTime = diving.find((attribute) => attribute.key === 'bottom_time_min');
    expect(depth?.normalizationRule.kind).toBe('toMetres');
    expect(bottomTime?.normalizationRule.kind).toBe('toMinutes');
  });

  it('gates on certification, with the technical levels present', () => {
    const diving = CATEGORY_ATTRIBUTES['scuba-diving'] ?? [];
    const certification = diving.find((attribute) => attribute.key === 'min_certification');
    const values = certification?.options.map((option) => option.value) ?? [];
    expect(values).toContain('open_water');
    expect(values).toContain('technical');
    expect(values).toContain('trimix');
  });

  it('carries required gas as an operator-set attribute, not a fact about a site', () => {
    const diving = CATEGORY_ATTRIBUTES['scuba-diving'] ?? [];
    const gas = diving.find((attribute) => attribute.key === 'required_gas');
    expect(gas, 'required_gas attribute is missing').toBeDefined();
    expect(gas?.dataType).toBe('multiEnum');
    expect(gas?.comparisonGroup).toBe('requirements');
    const values = gas?.options.map((option) => option.value) ?? [];
    expect(values).toEqual(
      expect.arrayContaining(['air', 'nitrox', 'trimix', 'ccr']),
    );
  });
});

describe('every attribute is a valid attribute definition', () => {
  it('parses against the contract schema', () => {
    for (const [slug, attributes] of Object.entries(CATEGORY_ATTRIBUTES)) {
      for (const attribute of attributes) {
        const candidate = {
          id: '018f3a4b-0000-7000-8000-000000000001',
          categoryId: '018f3a4b-0000-7000-8000-000000000002',
          key: attribute.key,
          labelKey: attribute.labelKey,
          dataType: attribute.dataType,
          unit: attribute.unit,
          isRequired: attribute.isRequired,
          isComparable: attribute.isComparable,
          comparisonGroup: attribute.comparisonGroup,
          comparisonOrder: attribute.comparisonOrder,
          normalizationRule: attribute.normalizationRule,
          options: attribute.options.map((option) => ({ ...option })),
        };
        const result = attributeDefinitionSchema.safeParse(candidate);
        expect(result.success, `${slug}.${attribute.key}: ${result.error?.message ?? ''}`).toBe(
          true,
        );
      }
    }
  });

  it('gives enum attributes choices and non-enum attributes none', () => {
    for (const attributes of Object.values(CATEGORY_ATTRIBUTES)) {
      for (const attribute of attributes) {
        if (attribute.dataType === 'enum' || attribute.dataType === 'multiEnum') {
          // guide_languages and briefing_languages share a vocabulary; the
          // latter is deliberately open, so only the comparable ones must
          // carry their own choices.
          if (attribute.isComparable) {
            expect(attribute.options.length, `${attribute.key}`).toBeGreaterThan(0);
          }
        } else {
          expect(attribute.options, `${attribute.key}`).toHaveLength(0);
        }
      }
    }
  });

  it('gives every measure a canonical unit', () => {
    for (const attributes of Object.values(CATEGORY_ATTRIBUTES)) {
      for (const attribute of attributes) {
        if (attribute.dataType === 'measure' || attribute.dataType === 'duration') {
          expect(attribute.unit, `${attribute.key} has no unit`).not.toBeNull();
        }
      }
    }
  });
});

describe('dive sites', () => {
  it('includes the sites the brief names', () => {
    const slugs = DIVE_SITES.map((site) => site.slug);
    for (const expected of [
      'blue-hole',
      'the-bells',
      'the-arch',
      'el-canyon',
      'three-pools',
      'eel-garden',
      'lighthouse',
      'gabr-el-bint',
      'ras-abu-galum',
    ]) {
      expect(slugs).toContain(expected);
    }
  });

  it('places every site in Dahab', () => {
    for (const site of DIVE_SITES) {
      assertInDahab(site.slug, site.latitude, site.longitude);
    }
  });

  it('keeps the Arch technical-only, gated on a cert level and not a hardcoded gas', () => {
    const arch = DIVE_SITES.find((site) => site.slug === 'the-arch');
    expect(arch?.difficulty).toBe('technical');
    expect(arch?.maxDepthMetres).toBeGreaterThanOrEqual(52);
    // The site demands a certification level, not a gas mix.
    expect(arch?.requiresCertification).toBe('technical');
    expect(arch?.requiresCertification).not.toMatch(/trimix|nitrox|ccr|air/i);
  });

  it('orders every depth range correctly and names real hazards', () => {
    for (const site of DIVE_SITES) {
      expect(site.minDepthMetres, site.slug).toBeLessThanOrEqual(site.maxDepthMetres);
      expect(site.hazards.length, `${site.slug} lists no hazards`).toBeGreaterThan(0);
      expect(site.marineLife.length, `${site.slug} lists no marine life`).toBeGreaterThan(0);
    }
  });

  it('records seasonal water temperature, which drives wetsuit guidance', () => {
    for (const site of DIVE_SITES) {
      expect(site.seasonalNotes['january']).toMatch(/22C/);
      expect(site.seasonalNotes['august']).toMatch(/28C/);
    }
  });
});

describe('vendors and neighborhoods', () => {
  it('seeds the operators the brief names', () => {
    const names = VENDORS.map((vendor) => vendor.displayName);
    for (const expected of [
      'Fanous Divers',
      'Blue Beach Freediving',
      'Sinai Nomads',
      'Baraka Kite',
      'Moya Yoga',
      'Shamandura Boat Trips',
      'Assalah Transfers',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('places every vendor in a seeded neighborhood, inside Dahab', () => {
    const slugs = new Set(NEIGHBORHOODS.map((item) => item.slug));
    for (const vendor of VENDORS) {
      expect(slugs, `${vendor.slug} sits in an unknown neighborhood`).toContain(
        vendor.neighborhood,
      );
      assertInDahab(vendor.slug, vendor.latitude, vendor.longitude);
    }
  });

  it('points every vendor at categories that exist', () => {
    const slugs = new Set(CATEGORIES.map((category) => category.slug));
    for (const vendor of VENDORS) {
      for (const category of vendor.categorySlugs) {
        expect(slugs, `${vendor.slug} claims unknown category ${category}`).toContain(category);
      }
    }
  });
});

describe('no lorem ipsum reaches a fixture', () => {
  it('contains no placeholder prose', () => {
    const corpus = JSON.stringify({ CATEGORIES, DIVE_SITES, NEIGHBORHOODS, VENDORS });
    for (const banned of ['lorem', 'ipsum', 'dolor sit', 'foo bar', 'example.com', 'Test Vendor']) {
      expect(corpus.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});

describe('the seed dates its days in Cairo, not in UTC', () => {
  /**
   * `local_date` is a Cairo date and every console board filters it against
   * one. Deriving it from `toISOString()` gives the UTC day, which between
   * 22:00 UTC and midnight is the previous Cairo day — so a seed run late in
   * the evening wrote the whole operating week a day early and the Today
   * board showed yesterday's boats. Nothing failed; the numbers were simply
   * wrong, which is why this is pinned rather than left to be noticed.
   */
  const cairoDay = (at: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(at);

  it('agrees with the formatter every board reads', () => {
    expect(inDays(0)).toBe(cairoDay(SEED_TODAY));
  });

  it('steps one calendar day at a time, forwards and back', () => {
    for (const offset of [-30, -7, -1, 0, 1, 7, 30]) {
      const expected = cairoDay(new Date(SEED_TODAY.getTime() + offset * 86_400_000));
      expect(inDays(offset)).toBe(expected);
    }
  });

  it('returns a bare YYYY-MM-DD, which is what the column holds', () => {
    expect(inDays(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is one day ahead of the UTC date during the Cairo evening', () => {
    // 22:30 UTC is 00:30 the next morning in Cairo. This is the window the
    // bug lived in, and the case a UTC-derived day gets wrong.
    const evening = new Date('2026-09-14T22:30:00Z');
    expect(evening.toISOString().slice(0, 10)).toBe('2026-09-14');
    expect(cairoDay(evening)).toBe('2026-09-15');
  });
});

describe('the seeded rate card is the one the seeded bookings were charged by', () => {
  /*
   * `pricing_models` and `pricing_rules` were empty while the module map called
   * them seeded. Now they are written from the same constants the bookings
   * were priced with — and this is what keeps them that way: every booking is
   * run back through computePrice() against the seeded rows, and has to come
   * out at exactly the total it was charged.
   */
  const SERVICE_ID = '018f3a4b-0000-7000-8000-0000000000c1';
  const ruleId = (index: number) =>
    `018f3a4b-0000-7000-8000-${String(index + 1).padStart(12, '0')}`;

  function pricingFor(slug: string) {
    const pricing = SEED_PRICING.find((entry) => entry.serviceSlug === slug);
    if (pricing === undefined) throw new Error(`no seeded pricing for ${slug}`);
    const model = {
      kind: pricing.kind,
      currency: pricing.currency,
      basePrice: { amount: pricing.basePriceMinor, currency: pricing.currency },
    };
    const rules: PricingRuleInput[] = pricing.rules.map((rule, index) => ({
      id: ruleId(index),
      labelKey: rule.labelKey,
      condition: rule.condition,
      adjustment: rule.adjustment,
      priority: rule.priority,
      stackable: rule.stackable,
    }));
    return { model, rules };
  }

  it('prices every seeded service, once', () => {
    expect(SEED_PRICING.map((entry) => entry.serviceSlug).sort()).toEqual(
      SERVICES.map((service) => service.slug).sort(),
    );
  });

  it('parses against the contract, so computePrice will accept what the table holds', () => {
    for (const entry of SEED_PRICING) {
      const { model, rules } = pricingFor(entry.serviceSlug);
      expect(pricingModelSchema.safeParse(model).success, entry.serviceSlug).toBe(true);
      for (const rule of rules) {
        expect(pricingRuleSchema.safeParse(rule).success, `${entry.serviceSlug} ${rule.labelKey}`).toBe(
          true,
        );
      }
    }
  });

  it.each(BOOKINGS.map((booking) => [booking.reference, booking] as const))(
    'reproduces %s to the piastre',
    (_reference, booking) => {
      const { model, rules } = pricingFor(booking.serviceSlug);
      const breakdown = computePrice({
        serviceId: SERVICE_ID,
        model,
        party: booking.party,
        activityAt: new Date('2026-09-26T06:00:00Z'),
        bookedAt: new Date('2026-09-20T06:00:00Z'),
        rules,
        quoteCurrency: 'EGP',
      });
      expect(breakdown.total).toEqual({ amount: booking.totalMinor, currency: 'EGP' });
    },
  );
});
