/**
 * Booking fixtures, including the cancellation cascade.
 *
 * "Weather cancels boats. Cancellation is a first-class, cascading operation"
 * is one of the domain rules, and it is the reason this screen exists rather
 * than a status dropdown. Cancelling a Thursday boat does not cancel one row:
 * it cancels every booking on it, the transfer that fed it, and opens a refund
 * leg per payment — and the operator has to see that whole chain before
 * committing, not after.
 *
 * Money is integer minor units plus a currency code throughout.
 */

/** `booking_status` */
export type BookingStatus =
  | 'pendingPayment'
  | 'confirmed'
  | 'awaitingVendor'
  | 'cancelledByTraveler'
  | 'cancelledByVendor'
  | 'cancelledByWeather'
  | 'noShow'
  | 'completed'
  | 'refunded'
  | 'disputed';

/** `participant_kind` */
export type ParticipantKind = 'adult' | 'child' | 'infant' | 'student' | 'resident' | 'instructor';

/**
 * Mirrors PARTICIPANT_RULES in @dahab/api-contract. Infants and accompanying
 * instructors are NOT billed but DO hold a seat — they appear on the manifest
 * and count against capacity, which is exactly the distinction a boat's
 * headcount depends on.
 */
export const PARTICIPANT_RULES: Record<
  ParticipantKind,
  { isChargeable: boolean; occupiesCapacity: boolean }
> = {
  adult: { isChargeable: true, occupiesCapacity: true },
  child: { isChargeable: true, occupiesCapacity: true },
  student: { isChargeable: true, occupiesCapacity: true },
  resident: { isChargeable: true, occupiesCapacity: true },
  infant: { isChargeable: false, occupiesCapacity: true },
  instructor: { isChargeable: false, occupiesCapacity: true },
};

export interface Money {
  readonly amountMinor: number;
  readonly currency: 'EGP';
}

export interface Booking {
  readonly id: string;
  readonly ref: string;
  readonly service: string;
  readonly vendor: string;
  readonly traveler: string;
  readonly departsAt: string;
  readonly status: BookingStatus;
  readonly party: Partial<Record<ParticipantKind, number>>;
  readonly total: Money;
}

export const BOOKINGS: readonly Booking[] = [
  {
    id: 'b-1',
    ref: 'DF-4471',
    service: 'Boat trip · The Islands & Umm Sid',
    vendor: 'Shamandura Boat Trips',
    traveler: 'Lena Fischer',
    departsAt: '2026-09-12T06:00:00Z',
    status: 'confirmed',
    party: { adult: 2 },
    total: { amountMinor: 264_000, currency: 'EGP' },
  },
  {
    id: 'b-2',
    ref: 'DF-4472',
    service: 'Boat trip · The Islands & Umm Sid',
    vendor: 'Shamandura Boat Trips',
    traveler: 'Marco Rossi',
    departsAt: '2026-09-12T06:00:00Z',
    status: 'confirmed',
    party: { adult: 2, child: 1, infant: 1 },
    total: { amountMinor: 356_400, currency: 'EGP' },
  },
  {
    id: 'b-3',
    ref: 'DF-4473',
    service: 'Boat trip · The Islands & Umm Sid',
    vendor: 'Shamandura Boat Trips',
    traveler: 'Amira Saleh',
    departsAt: '2026-09-12T06:00:00Z',
    status: 'confirmed',
    party: { resident: 3 },
    total: { amountMinor: 297_000, currency: 'EGP' },
  },
  {
    id: 'b-4',
    ref: 'DF-4474',
    service: 'Boat trip · The Islands & Umm Sid',
    vendor: 'Shamandura Boat Trips',
    traveler: 'Yuki Tanaka',
    departsAt: '2026-09-12T06:00:00Z',
    status: 'pendingPayment',
    party: { adult: 2 },
    total: { amountMinor: 264_000, currency: 'EGP' },
  },
  {
    id: 'b-5',
    ref: 'DF-4468',
    service: 'Two shore dives · The Bells',
    vendor: 'Fanous Divers',
    traveler: 'Sofia Marín',
    departsAt: '2026-09-11T06:30:00Z',
    status: 'awaitingVendor',
    party: { adult: 1, instructor: 1 },
    total: { amountMinor: 145_000, currency: 'EGP' },
  },
  {
    id: 'b-6',
    ref: 'DF-4455',
    service: 'Bedouin dinner · Wadi Gnai',
    vendor: 'Sinai Nomads',
    traveler: 'Tom Bakker',
    departsAt: '2026-09-09T15:30:00Z',
    status: 'completed',
    party: { adult: 4 },
    total: { amountMinor: 192_000, currency: 'EGP' },
  },
  {
    id: 'b-7',
    ref: 'DF-4460',
    service: 'Kite lesson · Blue Lagoon',
    vendor: 'Baraka Kite',
    traveler: 'Nadia Haddad',
    departsAt: '2026-09-08T13:00:00Z',
    status: 'disputed',
    party: { adult: 1 },
    total: { amountMinor: 180_000, currency: 'EGP' },
  },
  {
    id: 'b-8',
    ref: 'DF-4441',
    service: 'Freedive session · Blue Hole',
    vendor: 'Blue Beach Freediving',
    traveler: 'Paul Girard',
    departsAt: '2026-09-05T07:00:00Z',
    status: 'refunded',
    party: { adult: 2 },
    total: { amountMinor: 152_000, currency: 'EGP' },
  },
];

/** The departure a forecast is about to cancel. */
export interface Departure {
  readonly id: string;
  readonly service: string;
  readonly vendor: string;
  readonly departsAt: string;
  readonly capacity: number;
  readonly windForecastKt: number;
  /** The operator's own threshold, not a platform-wide guess. */
  readonly windLimitKt: number;
}

export const AT_RISK: Departure = {
  id: 'dep-thu',
  service: 'Boat trip · The Islands & Umm Sid',
  vendor: 'Shamandura Boat Trips',
  departsAt: '2026-09-12T06:00:00Z',
  capacity: 16,
  windForecastKt: 22,
  windLimitKt: 18,
};

/**
 * What a cancellation touches. Each step is a real consequence with its own
 * row in the db, not a line of copy — bookings, the transfer that fed the
 * departure, the refund legs, and the people who have to be told.
 */
export type CascadeKind = 'bookings' | 'transfer' | 'refunds' | 'notifications' | 'ledger';

export interface CascadeStep {
  readonly kind: CascadeKind;
  readonly count: number;
  /** Money moved by this step, where the step moves money. */
  readonly amount?: Money;
  /** Named so the operator can see exactly what is affected, not just a total. */
  readonly detail: readonly string[];
}

export const CASCADE: readonly CascadeStep[] = [
  {
    kind: 'bookings',
    count: 4,
    detail: ['DF-4471', 'DF-4472', 'DF-4473', 'DF-4474'],
  },
  {
    kind: 'transfer',
    count: 1,
    detail: ['Assalah Transfers · 07:10 pickup, Mashraba'],
  },
  {
    kind: 'refunds',
    count: 3,
    amount: { amountMinor: 917_400, currency: 'EGP' },
    // DF-4474 is pendingPayment, so there is nothing captured to refund — it
    // is released rather than refunded, which is why this count is 3 not 4.
    detail: ['DF-4471', 'DF-4472', 'DF-4473'],
  },
  {
    kind: 'ledger',
    count: 6,
    detail: ['refundsPayable', 'platformCommission', 'paymentFees'],
  },
  {
    kind: 'notifications',
    count: 5,
    detail: ['4 travellers', 'Assalah Transfers'],
  },
];

/** Party maths the manifest depends on. */
export function partyCounts(party: Partial<Record<ParticipantKind, number>>): {
  chargeable: number;
  capacity: number;
} {
  let chargeable = 0;
  let capacity = 0;
  for (const [kind, count] of Object.entries(party)) {
    const rule = PARTICIPANT_RULES[kind as ParticipantKind];
    if (rule.isChargeable) chargeable += count;
    if (rule.occupiesCapacity) capacity += count;
  }
  return { chargeable, capacity };
}
