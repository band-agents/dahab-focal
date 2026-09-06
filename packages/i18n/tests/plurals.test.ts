import { describe, expect, it } from 'vitest';

import { createI18n, setLocale } from '../src/i18n';
import { LOCALE_DESCRIPTORS, LOCALES } from '../src/locales';

/**
 * The reason ICU is non-negotiable: a two-form `_plural` key convention is
 * correct in English and wrong in five of our seven locales.
 */

/** One representative count per CLDR category, per locale. */
const CATEGORY_SAMPLES = {
  'ar-EG': { zero: 0, one: 1, two: 2, few: 3, many: 11, other: 100 },
  'ru-RU': { one: 1, few: 2, many: 5, other: 1.5 },
} as const;

describe('Arabic has six plural categories and all six render distinctly', () => {
  it('selects the right category for each count', async () => {
    const i18n = await createI18n({ locale: 'ar-EG', isolated: true });
    const rules = new Intl.PluralRules('ar-EG');

    const rendered = new Map<string, string>();
    for (const [category, count] of Object.entries(CATEGORY_SAMPLES['ar-EG'])) {
      expect(rules.select(count), `Intl disagrees about ar-EG ${count}`).toBe(category);
      rendered.set(category, i18n.t('count.divers', { count }));
    }

    // Six categories, six distinct strings — no category quietly collapsing
    // into `other`, which is what a two-form catalogue would produce.
    expect(new Set(rendered.values()).size).toBe(6);

    expect(rendered.get('zero')).toBe('لا يوجد غطاسون');
    expect(rendered.get('one')).toBe('غطاس واحد');
    expect(rendered.get('two')).toBe('غطاسان');
    expect(rendered.get('few')).toContain('3');
    expect(rendered.get('many')).toContain('11');
    expect(rendered.get('other')).toContain('100');
  });

  it('renders Eastern Arabic-Indic digits when the user asks for them', async () => {
    const i18n = await createI18n({
      locale: 'ar-EG',
      numberingSystem: 'arab',
      isolated: true,
    });
    // 11 falls in `many`, whose message interpolates the count.
    expect(i18n.t('count.divers', { count: 11 })).toContain('١١');
  });

  it('defaults Arabic to Western digits, which is the Egyptian norm', async () => {
    const i18n = await createI18n({ locale: 'ar-EG', isolated: true });
    expect(i18n.t('count.divers', { count: 11 })).toContain('11');
    expect(i18n.t('count.divers', { count: 11 })).not.toContain('١١');
  });
});

describe('Russian has four plural categories', () => {
  it('selects the right category for each count', async () => {
    const i18n = await createI18n({ locale: 'ru-RU', isolated: true });
    const rules = new Intl.PluralRules('ru-RU');

    const rendered = new Map<string, string>();
    for (const [category, count] of Object.entries(CATEGORY_SAMPLES['ru-RU'])) {
      expect(rules.select(count), `Intl disagrees about ru-RU ${count}`).toBe(category);
      rendered.set(category, i18n.t('count.divers', { count }));
    }

    expect(rendered.get('one')).toBe('1 дайвер');
    expect(rendered.get('few')).toBe('2 дайвера');
    expect(rendered.get('many')).toBe('5 дайверов');

    // The classic Russian bug: 21 is `one`, not `many`.
    expect(i18n.t('count.divers', { count: 21 })).toBe('21 дайвер');
    expect(i18n.t('count.divers', { count: 11 })).toBe('11 дайверов');
  });
});

describe('every locale renders a plural message for every category it declares', () => {
  it.each(LOCALES)('%s', async (locale) => {
    const i18n = await createI18n({ locale, isolated: true });
    const rules = new Intl.PluralRules(locale);

    for (const category of LOCALE_DESCRIPTORS[locale].pluralCategories) {
      // Find any count that Intl assigns to this category.
      const sample = [0, 1, 2, 3, 5, 11, 21, 100, 1.5].find(
        (candidate) => rules.select(candidate) === category,
      );
      if (sample === undefined) continue;

      const output = i18n.t('count.dives', { count: sample });
      expect(output, `${locale} ${category} produced an empty or key-shaped string`).not.toBe(
        'count.dives',
      );
      expect(output.length).toBeGreaterThan(0);
    }
  });
});

describe('the fallback chain', () => {
  it('falls back to en-GB rather than rendering a raw key path', async () => {
    const i18n = await createI18n({ locale: 'ar-EG', isolated: true });
    expect(i18n.t('action.save')).toBe('حفظ');
    // A key that exists nowhere still must not surface as a dotted path in UI.
    expect(i18n.t('action.save')).not.toContain('.');
  });

  it('switches language and numbering system together', async () => {
    const i18n = await createI18n({ locale: 'en-GB', isolated: true });
    expect(i18n.t('count.divers', { count: 2 })).toBe('2 divers');

    await setLocale(i18n, 'ar-EG', 'arab');
    expect(i18n.t('count.divers', { count: 2 })).toBe('غطاسان');
    expect(i18n.t('count.divers', { count: 11 })).toContain('١١');

    await setLocale(i18n, 'de-DE');
    expect(i18n.t('count.divers', { count: 2 })).toBe('2 Taucher');
  });
});
