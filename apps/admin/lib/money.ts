/**
 * Money fixtures.
 *
 * The ledger is double-entry, append-only, and corrected by REVERSAL rather
 * than by edit. That is the fact this screen has to make obvious: there is no
 * edit button on a ledger entry, and a correction is a new pair of legs that
 * references the entry it reverses.
 *
 * Every amount is integer minor units plus a currency code. Nothing here is a
 * float, and nothing is formatted by anything but @dahab/i18n.
 */

export interface Money {
  readonly amountMinor: number;
  readonly currency: 'EGP';
}

/** `payment_status` */
export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partiallyRefunded'
  | 'chargeback';

/** `payout_status` */
export type PayoutStatus = 'scheduled' | 'processing' | 'paid' | 'failed' | 'cancelled';

/** `payout_provider` */
export type PayoutProvider =
  | 'paymob'
  | 'kashier'
  | 'paypal'
  | 'fawry'
  | 'instapay'
  | 'wise'
  | 'bankTransfer';

/** `ledger_account` — the eight accounts every leg lands in. */
export type LedgerAccount =
  | 'travelerReceivable'
  | 'providerClearing'
  | 'platformCash'
  | 'vendorPayable'
  | 'platformCommission'
  | 'paymentFees'
  | 'refundsPayable'
  | 'taxPayable';

export interface Payment {
  readonly id: string;
  readonly bookingRef: string;
  readonly traveler: string;
  readonly provider: PayoutProvider;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly at: string;
}

export const PAYMENTS: readonly Payment[] = [
  {
    id: 'p-1',
    bookingRef: 'DF-4471',
    traveler: 'Lena Fischer',
    provider: 'paymob',
    status: 'captured',
    amount: { amountMinor: 264_000, currency: 'EGP' },
    at: '2026-09-08T11:12:00Z',
  },
  {
    id: 'p-2',
    bookingRef: 'DF-4472',
    traveler: 'Marco Rossi',
    provider: 'paymob',
    status: 'captured',
    amount: { amountMinor: 356_400, currency: 'EGP' },
    at: '2026-09-08T14:40:00Z',
  },
  {
    id: 'p-3',
    bookingRef: 'DF-4474',
    traveler: 'Yuki Tanaka',
    provider: 'fawry',
    status: 'pending',
    amount: { amountMinor: 264_000, currency: 'EGP' },
    at: '2026-09-10T18:02:00Z',
  },
  {
    id: 'p-4',
    bookingRef: 'DF-4460',
    traveler: 'Nadia Haddad',
    provider: 'paypal',
    status: 'chargeback',
    amount: { amountMinor: 180_000, currency: 'EGP' },
    at: '2026-09-08T09:30:00Z',
  },
  {
    id: 'p-5',
    bookingRef: 'DF-4441',
    traveler: 'Paul Girard',
    provider: 'kashier',
    status: 'refunded',
    amount: { amountMinor: 152_000, currency: 'EGP' },
    at: '2026-09-05T06:45:00Z',
  },
];

export interface Payout {
  readonly id: string;
  readonly vendor: string;
  readonly provider: PayoutProvider;
  readonly status: PayoutStatus;
  readonly gross: Money;
  readonly commission: Money;
  readonly fees: Money;
  readonly net: Money;
  readonly due: string;
}

export const PAYOUTS: readonly Payout[] = [
  {
    id: 'po-1',
    vendor: 'Fanous Divers',
    provider: 'instapay',
    status: 'scheduled',
    gross: { amountMinor: 1_842_000, currency: 'EGP' },
    commission: { amountMinor: 221_040, currency: 'EGP' },
    fees: { amountMinor: 27_630, currency: 'EGP' },
    net: { amountMinor: 1_593_330, currency: 'EGP' },
    due: '2026-09-15',
  },
  {
    id: 'po-2',
    vendor: 'Sinai Nomads',
    provider: 'bankTransfer',
    status: 'processing',
    gross: { amountMinor: 964_000, currency: 'EGP' },
    commission: { amountMinor: 115_680, currency: 'EGP' },
    fees: { amountMinor: 14_460, currency: 'EGP' },
    net: { amountMinor: 833_860, currency: 'EGP' },
    due: '2026-09-12',
  },
  {
    id: 'po-3',
    vendor: 'Shamandura Boat Trips',
    provider: 'instapay',
    status: 'scheduled',
    gross: { amountMinor: 742_000, currency: 'EGP' },
    commission: { amountMinor: 89_040, currency: 'EGP' },
    fees: { amountMinor: 11_130, currency: 'EGP' },
    net: { amountMinor: 641_830, currency: 'EGP' },
    due: '2026-09-15',
  },
  {
    id: 'po-4',
    vendor: 'Baraka Kite',
    provider: 'wise',
    status: 'failed',
    gross: { amountMinor: 634_000, currency: 'EGP' },
    commission: { amountMinor: 76_080, currency: 'EGP' },
    fees: { amountMinor: 9_510, currency: 'EGP' },
    net: { amountMinor: 548_410, currency: 'EGP' },
    due: '2026-09-08',
  },
];

export interface LedgerLeg {
  readonly id: string;
  readonly account: LedgerAccount;
  /** Positive is a debit, negative a credit. Every entry's legs sum to zero. */
  readonly amountMinor: number;
}

export interface LedgerEntry {
  readonly id: string;
  readonly at: string;
  readonly narrative: string;
  readonly bookingRef: string;
  readonly legs: readonly LedgerLeg[];
  /** Set where this entry exists only to reverse another one. */
  readonly reverses?: string;
  /** Set where a later entry reversed this one. */
  readonly reversedBy?: string;
}

export const LEDGER: readonly LedgerEntry[] = [
  {
    id: 'L-10431',
    at: '2026-09-08T11:12:00Z',
    narrative: 'Capture · Boat trip · The Islands & Umm Sid',
    bookingRef: 'DF-4471',
    legs: [
      { id: 'l-1', account: 'platformCash', amountMinor: 264_000 },
      { id: 'l-2', account: 'paymentFees', amountMinor: 3_960 },
      { id: 'l-3', account: 'travelerReceivable', amountMinor: -264_000 },
      { id: 'l-4', account: 'providerClearing', amountMinor: -3_960 },
    ],
  },
  {
    id: 'L-10432',
    at: '2026-09-08T11:12:01Z',
    narrative: 'Commission · Shamandura Boat Trips',
    bookingRef: 'DF-4471',
    legs: [
      { id: 'l-5', account: 'vendorPayable', amountMinor: -232_320 },
      { id: 'l-6', account: 'platformCommission', amountMinor: -31_680 },
      { id: 'l-7', account: 'platformCash', amountMinor: 264_000 },
    ],
  },
  {
    id: 'L-10455',
    at: '2026-09-09T08:20:00Z',
    narrative: 'Commission posted at the wrong rate',
    bookingRef: 'DF-4460',
    legs: [
      { id: 'l-8', account: 'vendorPayable', amountMinor: -144_000 },
      { id: 'l-9', account: 'platformCommission', amountMinor: -36_000 },
      { id: 'l-10', account: 'platformCash', amountMinor: 180_000 },
    ],
    reversedBy: 'L-10456',
  },
  {
    id: 'L-10456',
    at: '2026-09-09T08:41:00Z',
    narrative: 'Reversal of L-10455',
    bookingRef: 'DF-4460',
    legs: [
      { id: 'l-11', account: 'vendorPayable', amountMinor: 144_000 },
      { id: 'l-12', account: 'platformCommission', amountMinor: 36_000 },
      { id: 'l-13', account: 'platformCash', amountMinor: -180_000 },
    ],
    reverses: 'L-10455',
  },
];

/** The FX rate a booking was charged at, stored with the booking. */
export interface ExchangeRate {
  readonly pair: string;
  /** Scaled by 1e6, so the stored rate is an integer. */
  readonly rateScaled: number;
  readonly source: string;
  readonly at: string;
}

export const FX: ExchangeRate = {
  pair: 'EUR/EGP',
  rateScaled: 53_400_000,
  source: '[source pending]',
  at: '2026-09-11T06:00:00Z',
};

export const RATE_SCALE = 1_000_000;

/** An entry balances when its legs sum to zero. Shown, not assumed. */
export function entryBalance(entry: LedgerEntry): number {
  return entry.legs.reduce((total, leg) => total + leg.amountMinor, 0);
}
