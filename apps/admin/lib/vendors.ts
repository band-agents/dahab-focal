/**
 * Vendor fixtures.
 *
 * The seven seeded Dahab operators, shaped like `vendors` +
 * `vendor_documents` + `staff_certifications` + `resource_certifications` so
 * swapping in the tRPC admin router is a change of import rather than a change
 * of screen. Statuses and document types are the db's own enums.
 *
 * Expiry is the theme: a permit, an insurance certificate, a staff rating and
 * a tank's hydrostatic test all lapse, and every one has to surface before it
 * does rather than on the morning a boat is due out.
 */

/** `vendor_status` */
export type VendorStatus = 'applied' | 'inReview' | 'active' | 'suspended' | 'closed';

/** `verification_status` */
export type VerificationStatus = 'pending' | 'inReview' | 'verified' | 'rejected' | 'expired';

/** `vendor_document_type` */
export type DocumentType =
  | 'commercialRegister'
  | 'taxCard'
  | 'operatingPermit'
  | 'cdwsLicence'
  | 'diveAgencyAffiliation'
  | 'publicLiabilityInsurance'
  | 'boatLicence'
  | 'vehicleLicence'
  | 'other';

export interface Vendor {
  readonly id: string;
  readonly displayName: string;
  readonly neighborhood: string;
  readonly status: VendorStatus;
  readonly services: number;
  /** Rating in hundredths, so it never touches the float path. */
  readonly ratingHundredths: number | null;
  readonly reviews: number;
  readonly staff: number;
  readonly joined: string;
}

export const VENDORS: readonly Vendor[] = [
  {
    id: 'v-fanous',
    displayName: 'Fanous Divers',
    neighborhood: 'Masbat',
    status: 'active',
    services: 14,
    ratingHundredths: 490,
    reviews: 128,
    staff: 9,
    joined: '2026-03-02',
  },
  {
    id: 'v-bluebeach',
    displayName: 'Blue Beach Freediving',
    neighborhood: 'Blue Beach',
    status: 'active',
    services: 8,
    ratingHundredths: 480,
    reviews: 61,
    staff: 4,
    joined: '2026-03-19',
  },
  {
    id: 'v-shamandura',
    displayName: 'Shamandura Boat Trips',
    neighborhood: 'Masbat',
    status: 'active',
    services: 6,
    ratingHundredths: 470,
    reviews: 44,
    staff: 7,
    joined: '2026-04-08',
  },
  {
    id: 'v-nomads',
    displayName: 'Sinai Nomads',
    neighborhood: 'Assalah',
    status: 'active',
    services: 11,
    ratingHundredths: 490,
    reviews: 87,
    staff: 6,
    joined: '2026-04-21',
  },
  {
    id: 'v-moya',
    displayName: 'Moya Yoga',
    neighborhood: 'Eel Garden',
    status: 'active',
    services: 5,
    ratingHundredths: 500,
    reviews: 23,
    staff: 2,
    joined: '2026-05-30',
  },
  {
    id: 'v-baraka',
    displayName: 'Baraka Kite',
    neighborhood: 'Blue Lagoon',
    status: 'suspended',
    services: 4,
    ratingHundredths: 460,
    reviews: 31,
    staff: 3,
    joined: '2026-05-11',
  },
  {
    id: 'v-assalah',
    displayName: 'Assalah Transfers',
    neighborhood: 'Assalah',
    status: 'inReview',
    services: 3,
    ratingHundredths: null,
    reviews: 0,
    staff: 5,
    joined: '2026-09-01',
  },
];

export interface VendorDocument {
  readonly id: string;
  readonly vendorId: string;
  readonly type: DocumentType;
  /** Free text where the type alone is not specific enough — which boat, which van. */
  readonly detail?: string;
  readonly status: VerificationStatus;
  /** UTC date-only. Null where the document does not expire. */
  readonly expires: string | null;
  readonly issuer: string;
  /**
   * True where a lapse stops the operator publishing or running. An expired
   * liability certificate is not a warning, it is a stop.
   */
  readonly blocksPublishing: boolean;
}

export const DOCUMENTS: readonly VendorDocument[] = [
  {
    id: 'd-1',
    vendorId: 'v-baraka',
    type: 'publicLiabilityInsurance',
    status: 'expired',
    expires: '2026-09-06',
    issuer: 'Misr Insurance',
    blocksPublishing: true,
  },
  {
    id: 'd-2',
    vendorId: 'v-fanous',
    type: 'operatingPermit',
    status: 'verified',
    expires: '2026-09-14',
    issuer: 'South Sinai Governorate',
    blocksPublishing: true,
  },
  {
    id: 'd-3',
    vendorId: 'v-shamandura',
    type: 'boatLicence',
    detail: 'Shamandura II',
    status: 'verified',
    expires: '2026-09-22',
    issuer: 'Egyptian Maritime Authority',
    blocksPublishing: true,
  },
  {
    id: 'd-4',
    vendorId: 'v-fanous',
    type: 'other',
    detail: 'Tank hydrostatic test · 2 cylinders',
    status: 'verified',
    expires: '2026-09-28',
    issuer: 'CDWS approved centre',
    blocksPublishing: false,
  },
  {
    id: 'd-5',
    vendorId: 'v-bluebeach',
    type: 'cdwsLicence',
    status: 'verified',
    expires: '2026-10-19',
    issuer: 'CDWS',
    blocksPublishing: true,
  },
  {
    id: 'd-6',
    vendorId: 'v-moya',
    type: 'commercialRegister',
    status: 'verified',
    expires: '2026-11-30',
    issuer: 'GAFI',
    blocksPublishing: false,
  },
  {
    id: 'd-7',
    vendorId: 'v-assalah',
    type: 'vehicleLicence',
    detail: 'Minibus 2',
    status: 'verified',
    expires: '2026-12-04',
    issuer: 'Traffic Department',
    blocksPublishing: false,
  },
  {
    id: 'd-8',
    vendorId: 'v-assalah',
    type: 'commercialRegister',
    status: 'inReview',
    expires: null,
    issuer: 'GAFI',
    blocksPublishing: false,
  },
  {
    id: 'd-9',
    vendorId: 'v-assalah',
    type: 'publicLiabilityInsurance',
    status: 'pending',
    expires: null,
    issuer: 'Not yet supplied',
    blocksPublishing: true,
  },
  {
    id: 'd-10',
    vendorId: 'v-nomads',
    type: 'diveAgencyAffiliation',
    status: 'verified',
    expires: '2027-01-31',
    issuer: 'PADI',
    blocksPublishing: false,
  },
  {
    id: 'd-11',
    vendorId: 'v-baraka',
    type: 'taxCard',
    status: 'rejected',
    expires: null,
    issuer: 'Egyptian Tax Authority',
    blocksPublishing: true,
  },
];

export type ExpiryBand = 'expired' | 'within7' | 'within30' | 'within90' | 'later';

/**
 * Which band a date falls in, measured from `today` rather than from
 * `Date.now()` so a screenshot and a test can both pin the answer.
 *
 * Both instants are date-only UTC; Egypt observes DST, so nothing here does
 * arithmetic in local time.
 */
export function bandFor(expires: string | null, today: Date): ExpiryBand | null {
  if (expires === null) return null;
  const MS_PER_DAY = 86_400_000;
  const due = Date.parse(`${expires}T00:00:00Z`);
  const start = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.round((due - start) / MS_PER_DAY);
  if (days < 0) return 'expired';
  if (days <= 7) return 'within7';
  if (days <= 30) return 'within30';
  if (days <= 90) return 'within90';
  return 'later';
}

/** The console's "now". One constant, so every screen agrees. */
export const TODAY = new Date('2026-09-11T00:00:00Z');

export function vendorName(vendorId: string): string {
  return VENDORS.find((vendor) => vendor.id === vendorId)?.displayName ?? vendorId;
}
