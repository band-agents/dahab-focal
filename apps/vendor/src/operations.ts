/**
 * Bookings, services and money for one operator — Fanous Divers.
 *
 * The vendor's own slice: `booking.readVendor` scopes every read to the vendor
 * the session acts for, so nothing here reaches another operator's rows. Money
 * is integer minor units plus a currency code.
 */

export type BookingStatus =
  | 'pendingPayment'
  | 'confirmed'
  | 'awaitingVendor'
  | 'cancelledByWeather'
  | 'completed';

export interface Money {
  readonly amountMinor: number;
  readonly currency: 'EGP';
}

export interface VendorBooking {
  readonly id: string;
  readonly ref: string;
  readonly traveler: string;
  readonly service: string;
  readonly departsAt: string;
  readonly status: BookingStatus;
  readonly heads: number;
  readonly total: Money;
}

export const BOOKINGS: readonly VendorBooking[] = [
  {
    id: 'vb-1',
    ref: 'DF-4468',
    traveler: 'Sofia Marín',
    service: 'Two shore dives · The Bells',
    departsAt: '2026-09-11T06:30:00Z',
    status: 'awaitingVendor',
    heads: 2,
    total: { amountMinor: 145_000, currency: 'EGP' },
  },
  {
    id: 'vb-2',
    ref: 'DF-4471',
    traveler: 'Lena Fischer',
    service: 'Boat trip · The Islands',
    departsAt: '2026-09-11T11:00:00Z',
    status: 'confirmed',
    heads: 2,
    total: { amountMinor: 264_000, currency: 'EGP' },
  },
  {
    id: 'vb-3',
    ref: 'DF-4472',
    traveler: 'Erik Johansson',
    service: 'Boat trip · The Islands',
    departsAt: '2026-09-11T11:00:00Z',
    status: 'confirmed',
    heads: 1,
    total: { amountMinor: 132_000, currency: 'EGP' },
  },
  {
    id: 'vb-4',
    ref: 'DF-4474',
    traveler: 'Yuki Tanaka',
    service: 'Two shore dives · The Bells',
    departsAt: '2026-09-11T06:30:00Z',
    status: 'pendingPayment',
    heads: 1,
    total: { amountMinor: 72_500, currency: 'EGP' },
  },
];

/**
 * What cancelling the 14:00 boat touches.
 *
 * The operator sees this before committing, not after. Refunds are fewer than
 * bookings because one is still awaiting payment — it is released rather than
 * refunded, nothing having been captured.
 */
export interface CascadeStep {
  readonly kind: 'bookings' | 'transfer' | 'refunds' | 'notifications';
  readonly count: number;
  readonly amount?: Money;
  /**
   * References and proper nouns only — booking codes, an operator's name.
   * Anything that is prose goes through the catalogue instead, which is why
   * the notifications step carries `travellers` rather than a sentence.
   */
  readonly detail?: string;
  readonly travellers?: number;
  readonly transfer?: string;
}

export const CASCADE: readonly CascadeStep[] = [
  { kind: 'bookings', count: 2, detail: 'DF-4471 · DF-4472' },
  { kind: 'transfer', count: 1, detail: 'Assalah Transfers · 10:10, Mashraba' },
  { kind: 'refunds', count: 2, amount: { amountMinor: 396_000, currency: 'EGP' }, detail: 'DF-4471 · DF-4472' },
  { kind: 'notifications', count: 3, travellers: 2, transfer: 'Assalah Transfers' },
];

export type ServiceStatus = 'draft' | 'underReview' | 'published' | 'paused';

export interface VendorService {
  readonly id: string;
  readonly title: string;
  readonly categorySlug: string;
  readonly status: ServiceStatus;
  readonly from: Money;
  /** Comparable attributes still unanswered — what stops it being compared. */
  readonly missingComparable: number;
  /** Inclusions the hidden-cost detector normalises against. */
  readonly inclusions: readonly string[];
}

export const SERVICES: readonly VendorService[] = [
  {
    id: 'vs-1',
    title: 'Two shore dives · The Bells to the Blue Hole',
    categorySlug: 'diving',
    status: 'published',
    from: { amountMinor: 145_000, currency: 'EGP' },
    missingComparable: 0,
    inclusions: ['equipment', 'marinePark', 'guide', 'lunch'],
  },
  {
    id: 'vs-2',
    title: 'Night dive · Eel Garden',
    categorySlug: 'diving',
    status: 'underReview',
    from: { amountMinor: 76_000, currency: 'EGP' },
    missingComparable: 3,
    inclusions: ['equipment', 'guide'],
  },
  {
    id: 'vs-3',
    title: 'Discover Scuba · Lighthouse',
    categorySlug: 'courses',
    status: 'published',
    from: { amountMinor: 190_000, currency: 'EGP' },
    missingComparable: 0,
    inclusions: ['equipment', 'guide', 'certificate'],
  },
  {
    id: 'vs-4',
    title: 'The Arch · technical',
    categorySlug: 'diving',
    status: 'draft',
    from: { amountMinor: 640_000, currency: 'EGP' },
    missingComparable: 6,
    inclusions: ['equipment', 'guide', 'trimix'],
  },
];

/** Owner-only: `payout.readOwn`. */
export interface Earnings {
  readonly period: string;
  readonly gross: Money;
  readonly commission: Money;
  readonly fees: Money;
  readonly net: Money;
  readonly nextPayout: string;
}

export const EARNINGS: Earnings = {
  period: '2026-09',
  gross: { amountMinor: 1_842_000, currency: 'EGP' },
  commission: { amountMinor: 221_040, currency: 'EGP' },
  fees: { amountMinor: 27_630, currency: 'EGP' },
  net: { amountMinor: 1_593_330, currency: 'EGP' },
  nextPayout: '2026-09-15',
};

/** Owner-only: `staff.manage` and the expiry that gates assignment. */
export interface StaffMember {
  readonly id: string;
  readonly name: string;
  readonly rating: string;
  readonly expiresOn: string;
  /** True when the rating has lapsed — the calendar refuses to assign them. */
  readonly lapsed: boolean;
}

export const STAFF: readonly StaffMember[] = [
  { id: 'st-1', name: 'Yasmin', rating: 'PADI Divemaster', expiresOn: '2027-04-30', lapsed: false },
  { id: 'st-2', name: 'Omar', rating: 'PADI Instructor', expiresOn: '2026-09-30', lapsed: false },
  { id: 'st-3', name: 'Karim', rating: 'PADI Divemaster', expiresOn: '2026-08-31', lapsed: true },
];

/** Tanks inside their hydrostatic window cannot go on a manifest. */
export interface Resource {
  readonly id: string;
  readonly label: string;
  readonly kind: 'tank' | 'boat' | 'vehicle' | 'regulator';
  readonly dueOn: string;
  readonly blocked: boolean;
}

export const RESOURCES: readonly Resource[] = [
  { id: 'r-1', label: 'Cylinder 12L · #14', kind: 'tank', dueOn: '2026-09-28', blocked: true },
  { id: 'r-2', label: 'Cylinder 12L · #22', kind: 'tank', dueOn: '2026-09-28', blocked: true },
  { id: 'r-3', label: 'Regulator set · #6', kind: 'regulator', dueOn: '2027-02-14', blocked: false },
];
