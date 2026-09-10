/**
 * Console fixtures.
 *
 * Real Dahab, drawn from packages/db's seed: the seven licensed operators, the
 * real dive sites and the real neighbourhoods. Nothing here is lorem ipsum and
 * no figure is invented — money is integer minor units with a currency code,
 * exactly as the API returns it, and dates are UTC instants rendered in
 * Africa/Cairo by @dahab/i18n.
 *
 * This stands in for the tRPC client until apps/api exposes the admin router.
 * The shapes deliberately match the db schema so swapping the source is a
 * change of import, not a change of screen.
 */
import type { MarkName } from '@dahab/ui-web';

export interface Departure {
  readonly id: string;
  readonly time: string;
  readonly service: string;
  readonly vendor: string;
  readonly site: string;
  readonly booked: number;
  readonly capacity: number;
  readonly mark: MarkName;
}

/** Today's departures, Africa/Cairo. Capacity comes from the resource. */
export const DEPARTURES: readonly Departure[] = [
  {
    id: 'dep-1',
    time: '09:30',
    service: 'Two shore dives · The Bells',
    vendor: 'Fanous Divers',
    site: 'The Bells',
    booked: 8,
    capacity: 8,
    mark: 'fin',
  },
  {
    id: 'dep-2',
    time: '10:00',
    service: 'Freedive session',
    vendor: 'Blue Beach Freediving',
    site: 'Blue Hole',
    booked: 5,
    capacity: 6,
    mark: 'depth',
  },
  {
    id: 'dep-3',
    time: '11:15',
    service: 'Snorkel & tea',
    vendor: 'Shamandura Boat Trips',
    site: 'Eel Garden',
    booked: 11,
    capacity: 16,
    mark: 'mask',
  },
  {
    id: 'dep-4',
    time: '13:00',
    service: 'Camel to Ras Abu Galum',
    vendor: 'Sinai Nomads',
    site: 'Ras Abu Galum',
    booked: 6,
    capacity: 10,
    mark: 'camel',
  },
];

export type ExpiryBand = 'expired' | 'within7' | 'within30' | 'within90';

export interface ExpiringDocument {
  readonly id: string;
  readonly vendor: string;
  /** A `vendor_document_type` value; the label is translated at the edge. */
  readonly document: string;
  readonly expires: string;
  readonly band: ExpiryBand;
  /** True where the lapse stops the operator publishing or running. */
  readonly blocksPublishing: boolean;
}

export const EXPIRING: readonly ExpiringDocument[] = [
  {
    id: 'doc-1',
    vendor: 'Baraka Kite',
    document: 'Public liability insurance',
    expires: '2026-09-06',
    band: 'expired',
    blocksPublishing: true,
  },
  {
    id: 'doc-2',
    vendor: 'Fanous Divers',
    document: 'Operating permit',
    expires: '2026-09-14',
    band: 'within7',
    blocksPublishing: true,
  },
  {
    id: 'doc-3',
    vendor: 'Shamandura Boat Trips',
    document: 'Boat licence · Shamandura II',
    expires: '2026-09-22',
    band: 'within30',
    blocksPublishing: true,
  },
  {
    id: 'doc-4',
    vendor: 'Fanous Divers',
    document: 'Tank hydrostatic test · 2 cylinders',
    expires: '2026-09-28',
    band: 'within30',
    blocksPublishing: false,
  },
  {
    id: 'doc-5',
    vendor: 'Moya Yoga',
    document: 'Commercial register',
    expires: '2026-11-30',
    band: 'within90',
    blocksPublishing: false,
  },
  {
    id: 'doc-6',
    vendor: 'Assalah Transfers',
    document: 'Vehicle licence · minibus 2',
    expires: '2026-12-04',
    band: 'within90',
    blocksPublishing: false,
  },
];

export type IncidentSeverity = 'nearMiss' | 'minor' | 'serious' | 'critical';

export interface Incident {
  readonly id: string;
  readonly kind: string;
  readonly vendor: string;
  readonly site: string;
  readonly severity: IncidentSeverity;
  readonly reportedAt: string;
}

export const INCIDENTS: readonly Incident[] = [
  {
    id: 'inc-1',
    kind: 'Equipment failure · regulator free-flow',
    vendor: 'Fanous Divers',
    site: 'The Bells',
    severity: 'minor',
    reportedAt: '2026-09-09T06:40:00Z',
  },
  {
    id: 'inc-2',
    kind: 'Near miss · separated buddy pair',
    vendor: 'Blue Beach Freediving',
    site: 'Blue Hole',
    severity: 'nearMiss',
    reportedAt: '2026-09-08T07:15:00Z',
  },
];

/** Integer minor units plus a currency code, never a float. */
export interface MoneyFixture {
  readonly amountMinor: number;
  readonly currency: 'EGP';
}

export interface Counters {
  readonly needsAction: number;
  readonly disputesWaiting: number;
  readonly payoutsDue: number;
  readonly payoutsTotal: MoneyFixture;
  readonly grossBookings: MoneyFixture;
  /** Basis points, so the take rate is never a float either. */
  readonly takeRateBasisPoints: number;
}

export const COUNTERS: Counters = {
  needsAction: 5,
  disputesWaiting: 2,
  payoutsDue: 4,
  payoutsTotal: { amountMinor: 4_182_600, currency: 'EGP' },
  grossBookings: { amountMinor: 21_940_000, currency: 'EGP' },
  takeRateBasisPoints: 1200,
};

export interface Conditions {
  readonly windKt: number;
  readonly waterC: number;
  readonly visibilityM: number;
  /** Set when the forecast threatens a booked boat departure. */
  readonly boatsAtRisk: number;
}

export const CONDITIONS: Conditions = {
  windKt: 6,
  waterC: 22,
  visibilityM: 25,
  boatsAtRisk: 0,
};
