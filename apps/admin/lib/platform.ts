/**
 * Platform fixtures: the audit log, feature flags, geography and translations.
 *
 * The audit log is the counterweight to the admin role holding every
 * permission. An admin acts on any vendor through the `.readAny` / `.manage`
 * forms, and every one of those actions lands here with an actor, a target and
 * a reason — so the console's power is visible rather than merely granted.
 */

import { LOCALES } from '@dahab/i18n/server';
import type { Locale } from '@dahab/i18n/server';

export interface AuditRecord {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  /** The permission exercised, not the button pressed. */
  readonly permission: string;
  readonly target: string;
  readonly reason: string;
}

export const AUDIT: readonly AuditRecord[] = [
  {
    id: 'au-1',
    at: '2026-09-10T15:22:00Z',
    actor: 'ops@dahabfocal',
    permission: 'vendor.verify',
    target: 'Baraka Kite · tax card',
    reason: 'Document is for a different legal entity.',
  },
  {
    id: 'au-2',
    at: '2026-09-10T11:05:00Z',
    actor: 'ops@dahabfocal',
    permission: 'vendor.readAny',
    target: 'Baraka Kite',
    reason: 'Dispute DF-4460 investigation.',
  },
  {
    id: 'au-3',
    at: '2026-09-09T08:41:00Z',
    actor: 'finance@dahabfocal',
    permission: 'payout.manage',
    target: 'Ledger L-10455',
    reason: 'Commission posted at the wrong rate; reversed as L-10456.',
  },
  {
    id: 'au-4',
    at: '2026-09-08T16:10:00Z',
    actor: 'support@dahabfocal',
    permission: 'user.impersonate',
    target: 'Traveller · Yuki Tanaka',
    reason: 'Reproducing a Fawry payment that never confirmed. 12 minutes.',
  },
  {
    id: 'au-5',
    at: '2026-09-07T09:30:00Z',
    actor: 'ops@dahabfocal',
    permission: 'taxonomy.manage',
    target: 'diving · required_gas',
    reason: 'Added ccr to the gas options.',
  },
];

export interface FeatureFlag {
  readonly key: string;
  readonly on: boolean;
  readonly gates: string;
  readonly rollout: string;
}

export const FLAGS: readonly FeatureFlag[] = [
  {
    key: 'comparison.weightSliders',
    on: true,
    gates: 'Weight sliders in the traveller comparison',
    rollout: 'All travellers',
  },
  {
    key: 'comparison.hiddenCostDetector',
    on: true,
    gates: 'Normalises inclusions into one shown price',
    rollout: 'All travellers',
  },
  {
    key: 'vendor.selfServePricing',
    on: false,
    gates: 'Operators edit their own pricing rules',
    rollout: '[pending a pricing review]',
  },
  {
    key: 'traveler.offlineVouchers',
    on: true,
    gates: 'Vouchers and site maps saved to the device',
    rollout: 'All travellers',
  },
  {
    key: 'admin.nightDive',
    on: true,
    gates: 'Night Dive theme across the console',
    rollout: 'Staff',
  },
];

export interface DiveSite {
  readonly name: string;
  readonly depthM: number;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced' | 'technical';
  readonly entry: 'shore' | 'boat' | 'both';
  readonly hazard: string | null;
}

export const SITES: readonly DiveSite[] = [
  { name: 'Blue Hole', depthM: 102, difficulty: 'intermediate', entry: 'shore', hazard: 'The Arch at 56 m is technical-only' },
  { name: 'The Bells', depthM: 27, difficulty: 'intermediate', entry: 'shore', hazard: 'Chimney entry, no bail-out to surface' },
  { name: 'The Arch', depthM: 56, difficulty: 'technical', entry: 'shore', hazard: 'Trimix or full cave/tech ticket, 100 logged dives' },
  { name: 'El Canyon', depthM: 54, difficulty: 'advanced', entry: 'shore', hazard: 'Overhead sections' },
  { name: 'Eel Garden', depthM: 18, difficulty: 'beginner', entry: 'shore', hazard: null },
  { name: 'Gabr El Bint', depthM: 40, difficulty: 'advanced', entry: 'both', hazard: 'Remote; camel or boat access only' },
  { name: 'Ras Abu Galum', depthM: 30, difficulty: 'intermediate', entry: 'both', hazard: 'Protected area, permit required' },
  { name: 'Umm Sid', depthM: 25, difficulty: 'beginner', entry: 'boat', hazard: null },
];

/**
 * Translation coverage per locale, across the vendor-authored tables —
 * `service_translations`, `review_translations`, `message_translations`.
 * This is how Arabic written by a Dahab operator reaches six other languages.
 */
export interface TranslationCoverage {
  readonly locale: Locale;
  readonly human: number;
  readonly machine: number;
  readonly needsReview: number;
  readonly missing: number;
}

const COVERAGE: Record<string, Omit<TranslationCoverage, 'locale'>> = {
  'en-GB': { human: 118, machine: 0, needsReview: 0, missing: 0 },
  'ar-EG': { human: 118, machine: 0, needsReview: 0, missing: 0 },
  'de-DE': { human: 74, machine: 41, needsReview: 12, missing: 3 },
  'ru-RU': { human: 52, machine: 60, needsReview: 19, missing: 6 },
  'it-IT': { human: 44, machine: 66, needsReview: 21, missing: 8 },
  'fr-FR': { human: 61, machine: 51, needsReview: 14, missing: 6 },
  'es-ES': { human: 48, machine: 63, needsReview: 18, missing: 7 },
};

export const TRANSLATIONS: readonly TranslationCoverage[] = LOCALES.map((locale) => ({
  locale,
  ...(COVERAGE[locale] ?? { human: 0, machine: 0, needsReview: 0, missing: 0 }),
}));
