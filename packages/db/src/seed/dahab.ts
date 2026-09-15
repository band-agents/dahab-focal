/**
 * Real Dahab. No lorem ipsum, in code or in fixtures (CLAUDE.md).
 *
 * Coordinates are to roughly 10 m and were taken from public dive-site
 * listings and OSM; they are good enough to exercise a spatial index and to
 * put a pin on a map, and they are flagged in docs/FOUNDATION.md as needing a
 * survey pass before anyone navigates by them.
 *
 * Depths, difficulty ratings and certification gates are the values operators
 * in Dahab actually brief to, and the Arch really is technical-only.
 */

export interface SeedNeighborhood {
  readonly slug: string;
  readonly nameKey: string;
  readonly latitude: number;
  readonly longitude: number;
}

export const NEIGHBORHOODS: readonly SeedNeighborhood[] = [
  { slug: 'assalah', nameKey: 'neighborhood.assalah', latitude: 28.5083, longitude: 34.5167 },
  { slug: 'masbat', nameKey: 'neighborhood.masbat', latitude: 28.5122, longitude: 34.5183 },
  { slug: 'mashraba', nameKey: 'neighborhood.mashraba', latitude: 28.4956, longitude: 34.5142 },
  {
    slug: 'eel-garden-quarter',
    nameKey: 'neighborhood.eelGarden',
    latitude: 28.5158,
    longitude: 34.5192,
  },
  {
    slug: 'lighthouse-quarter',
    nameKey: 'neighborhood.lighthouse',
    latitude: 28.5031,
    longitude: 34.5178,
  },
  { slug: 'blue-beach', nameKey: 'neighborhood.blueBeach', latitude: 28.49, longitude: 34.512 },
];

export type DiveSiteDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'technical';
export type DiveSiteEntry = 'shore' | 'boat' | 'both';

export interface SeedDiveSite {
  readonly slug: string;
  readonly nameKey: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly minDepthMetres: number;
  readonly maxDepthMetres: number;
  readonly difficulty: DiveSiteDifficulty;
  readonly entryType: DiveSiteEntry;
  readonly requiresCertification: string | null;
  readonly marineLife: readonly string[];
  readonly hazards: readonly string[];
  readonly seasonalNotes: Readonly<Record<string, string>>;
}

/** Water is around 22 C in January and 28 C in August, everywhere here. */
const WATER_TEMPERATURE: Readonly<Record<string, string>> = {
  january: '22C, 5mm wetsuit or a 7mm if you feel the cold',
  april: '24C, 5mm wetsuit',
  august: '28C, 3mm shorty is enough',
  november: '26C, 3mm to 5mm',
};

export const DIVE_SITES: readonly SeedDiveSite[] = [
  {
    slug: 'blue-hole',
    nameKey: 'diveSite.blueHole',
    latitude: 28.5722,
    longitude: 34.5372,
    minDepthMetres: 6,
    maxDepthMetres: 110,
    difficulty: 'intermediate',
    entryType: 'shore',
    requiresCertification: 'Open Water',
    marineLife: ['anthias', 'napoleon wrasse', 'trevally', 'hard coral', 'triggerfish'],
    hazards: ['depth temptation', 'no natural bottom inside the hole', 'busy shore entry'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'the-bells',
    nameKey: 'diveSite.theBells',
    latitude: 28.5747,
    longitude: 34.5378,
    minDepthMetres: 5,
    maxDepthMetres: 30,
    difficulty: 'intermediate',
    entryType: 'shore',
    requiresCertification: 'Advanced Open Water',
    marineLife: ['glassfish', 'lionfish', 'gorgonian fans', 'anthias'],
    hazards: ['narrow chimney entry', 'wall with no shallow shelf'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'the-arch',
    nameKey: 'diveSite.theArch',
    latitude: 28.572,
    longitude: 34.5382,
    minDepthMetres: 52,
    maxDepthMetres: 56,
    difficulty: 'technical',
    entryType: 'shore',
    // The Arch is the reason certifications gate activities at all: a 56 m
    // crossing on the far side of the Blue Hole's saddle, well below
    // recreational limits, with a serious fatality record. The site demands a
    // technical certification LEVEL; it does not dictate a gas mix. Which gas
    // (trimix, a rebreather, …) is the operator's condition, recorded per
    // service in the `required_gas` attribute, so a dive centre can state its
    // own terms without a code change.
    requiresCertification: 'technical',
    marineLife: ['gorgonian fans', 'pelagics on the outside wall'],
    hazards: ['56m crossing', 'narcosis', 'no direct ascent to the surface inside'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'el-canyon',
    nameKey: 'diveSite.elCanyon',
    latitude: 28.5261,
    longitude: 34.5169,
    minDepthMetres: 12,
    maxDepthMetres: 52,
    difficulty: 'advanced',
    entryType: 'shore',
    requiresCertification: 'Advanced Open Water',
    marineLife: ['glassfish', 'stonefish', 'crocodilefish', 'coral garden on the plateau'],
    hazards: ['overhead environment in the canyon', 'silt-out if finned badly'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'three-pools',
    nameKey: 'diveSite.threePools',
    latitude: 28.5468,
    longitude: 34.5262,
    minDepthMetres: 3,
    maxDepthMetres: 25,
    difficulty: 'beginner',
    entryType: 'shore',
    requiresCertification: null,
    marineLife: ['sea grass', 'garden eels', 'juvenile reef fish', 'sandy pools'],
    hazards: ['shallow coral on exit at low water'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'eel-garden',
    nameKey: 'diveSite.eelGarden',
    latitude: 28.5117,
    longitude: 34.5211,
    minDepthMetres: 5,
    maxDepthMetres: 30,
    difficulty: 'beginner',
    entryType: 'shore',
    requiresCertification: null,
    marineLife: ['garden eels', 'blue-spotted stingray', 'scorpionfish', 'sea grass'],
    hazards: ['boat traffic near the drop-off'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'lighthouse',
    nameKey: 'diveSite.lighthouse',
    latitude: 28.5008,
    longitude: 34.5175,
    minDepthMetres: 2,
    maxDepthMetres: 30,
    difficulty: 'beginner',
    entryType: 'shore',
    requiresCertification: null,
    marineLife: ['clownfish', 'moray', 'octopus', 'ghost pipefish in season'],
    hazards: ['very busy: training groups, snorkelers, freedivers'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'gabr-el-bint',
    nameKey: 'diveSite.gabrElBint',
    latitude: 28.4083,
    longitude: 34.4917,
    minDepthMetres: 8,
    maxDepthMetres: 40,
    difficulty: 'advanced',
    entryType: 'both',
    requiresCertification: 'Advanced Open Water',
    marineLife: ['pristine hard coral', 'napoleon wrasse', 'turtles', 'pelagics'],
    hazards: ['remote: camel or boat access only', 'no facilities', 'current on the point'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'ras-abu-galum',
    nameKey: 'diveSite.rasAbuGalum',
    latitude: 28.6208,
    longitude: 34.5486,
    minDepthMetres: 5,
    maxDepthMetres: 40,
    difficulty: 'intermediate',
    entryType: 'shore',
    requiresCertification: 'Open Water',
    marineLife: ['untouched reef', 'turtles', 'eagle rays', 'nudibranchs'],
    hazards: ['protectorate: camel or boat access', 'no mobile signal', 'no chamber nearby'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'the-islands',
    nameKey: 'diveSite.theIslands',
    latitude: 28.4667,
    longitude: 34.5117,
    minDepthMetres: 3,
    maxDepthMetres: 30,
    difficulty: 'beginner',
    entryType: 'both',
    requiresCertification: null,
    marineLife: ['hard coral labyrinth', 'glassfish', 'moray', 'blue-spotted stingray'],
    hazards: ['maze of coral heads: easy to lose the guide', 'shallow exit at low water'],
    seasonalNotes: WATER_TEMPERATURE,
  },
  {
    slug: 'umm-sid',
    nameKey: 'diveSite.ummSid',
    latitude: 28.4772,
    longitude: 34.5136,
    minDepthMetres: 5,
    maxDepthMetres: 30,
    difficulty: 'beginner',
    entryType: 'both',
    requiresCertification: null,
    marineLife: ['anemone city', 'gorgonian fans', 'lionfish', 'crocodilefish'],
    hazards: ['current on the point when the wind is up'],
    seasonalNotes: WATER_TEMPERATURE,
  },
];

export interface SeedVendor {
  readonly slug: string;
  readonly legalName: string;
  readonly displayName: string;
  readonly neighborhood: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly categorySlugs: readonly string[];
  /**
   * Not every operator is `active`. A roster where all seven are green cannot
   * exercise the console: the suspension and the application in review are
   * what the status column, the verification queue and the expiry board are
   * for. `vendor_status` in the schema.
   */
  readonly status: 'applied' | 'inReview' | 'active' | 'suspended' | 'closed';
  readonly verificationStatus: 'pending' | 'inReview' | 'verified' | 'rejected' | 'expired';
}

export const VENDORS: readonly SeedVendor[] = [
  {
    slug: 'fanous-divers',
    legalName: 'Fanous Divers for Diving Services',
    displayName: 'Fanous Divers',
    neighborhood: 'masbat',
    latitude: 28.5119,
    longitude: 34.518,
    categorySlugs: ['scuba-diving', 'courses-certifications', 'gear-rental'],
    status: 'active',
    verificationStatus: 'verified',
  },
  {
    slug: 'blue-beach-freediving',
    legalName: 'Blue Beach Freediving',
    displayName: 'Blue Beach Freediving',
    neighborhood: 'blue-beach',
    latitude: 28.4903,
    longitude: 34.5124,
    categorySlugs: ['freediving', 'courses-certifications'],
    status: 'active',
    verificationStatus: 'verified',
  },
  {
    slug: 'sinai-nomads',
    legalName: 'Sinai Nomads Tourism',
    displayName: 'Sinai Nomads',
    neighborhood: 'assalah',
    latitude: 28.5079,
    longitude: 34.5163,
    categorySlugs: ['desert-safari', 'bedouin-culture'],
    status: 'active',
    verificationStatus: 'verified',
  },
  {
    slug: 'baraka-kite',
    legalName: 'Baraka Kite Centre',
    displayName: 'Baraka Kite',
    neighborhood: 'blue-beach',
    latitude: 28.4885,
    longitude: 34.5108,
    categorySlugs: ['kitesurfing', 'gear-rental', 'courses-certifications'],
    // Suspended: the liability certificate lapsed on 6 September and the tax
    // card was rejected. Both are in VENDOR_DOCUMENTS below.
    status: 'suspended',
    verificationStatus: 'verified',
  },
  {
    slug: 'moya-yoga',
    legalName: 'Moya Yoga Studio',
    displayName: 'Moya Yoga',
    neighborhood: 'mashraba',
    latitude: 28.4961,
    longitude: 34.5147,
    categorySlugs: ['wellness-yoga'],
    status: 'active',
    verificationStatus: 'verified',
  },
  {
    slug: 'shamandura-boat-trips',
    legalName: 'Shamandura for Marine Trips',
    displayName: 'Shamandura Boat Trips',
    neighborhood: 'masbat',
    latitude: 28.5131,
    longitude: 34.5189,
    categorySlugs: ['boat-trips', 'snorkeling'],
    status: 'active',
    verificationStatus: 'verified',
  },
  {
    slug: 'assalah-transfers',
    legalName: 'Assalah Transfers',
    displayName: 'Assalah Transfers',
    neighborhood: 'assalah',
    latitude: 28.5071,
    longitude: 34.5159,
    categorySlugs: ['transfers'],
    // The newest applicant: commercial register submitted, liability cover
    // not supplied yet. This is what the verification queue exists to show.
    status: 'inReview',
    verificationStatus: 'inReview',
  },
];

/**
 * The paperwork every Dahab operator actually carries, and the dates it runs
 * out on. This is the spine of the vendor model: a CDWS licence, a governorate
 * operating permit, public liability cover, a boat or vehicle licence and a
 * cylinder's hydrostatic test all lapse, and the console's whole job is to
 * surface each one before it does.
 *
 * `blocksPublishing` is per document rather than per type on purpose — an
 * expired liability certificate stops the operator trading, an overdue tank
 * test stops that cylinder.
 *
 * Dates are relative to SEED_TODAY so the expiry board has something in every
 * band no matter when the seed is run; re-seeding moves them forward.
 */
export const SEED_TODAY = new Date();

/**
 * A calendar day relative to the seed's own "today", as YYYY-MM-DD.
 *
 * Exported because the operational seed dates everything the same way — a
 * departure this morning, a payout last Thursday, a review a fortnight old —
 * and two different notions of "today" inside one seed would put the console's
 * boards out of step with each other.
 */
export function inDays(days: number): string {
  const date = new Date(SEED_TODAY.getTime() + days * 86_400_000);
  // The Cairo calendar day, not the UTC one.
  //
  // `local_date` is a Cairo date and every board filters it against a Cairo
  // date. `toISOString()` gives the UTC day, which between 22:00 UTC and
  // midnight is the *previous* Cairo day — so seeding late in the evening
  // wrote the whole operating week one day early and the console's "today"
  // showed yesterday's boats. `en-CA` formats as YYYY-MM-DD, which is the
  // shape the column holds.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(date);
}

export interface SeedVendorDocument {
  readonly vendorSlug: string;
  readonly type:
    | 'commercialRegister'
    | 'taxCard'
    | 'operatingPermit'
    | 'cdwsLicence'
    | 'diveAgencyAffiliation'
    | 'publicLiabilityInsurance'
    | 'boatLicence'
    | 'vehicleLicence'
    | 'other';
  readonly documentNumber: string | null;
  readonly issuer: string;
  /** Days from today. Negative is already lapsed. Null never expires. */
  readonly expiresInDays: number | null;
  readonly blocksPublishing: boolean;
  readonly verificationStatus: 'pending' | 'inReview' | 'verified' | 'rejected' | 'expired';
  readonly rejectionReason?: string;
}

export const VENDOR_DOCUMENTS: readonly SeedVendorDocument[] = [
  // Lapsed, and it stops them trading — which is why Baraka Kite is suspended.
  {
    vendorSlug: 'baraka-kite',
    type: 'publicLiabilityInsurance',
    documentNumber: 'MI-2261-4408',
    issuer: 'Misr Insurance',
    expiresInDays: -5,
    blocksPublishing: true,
    verificationStatus: 'expired',
  },
  {
    vendorSlug: 'baraka-kite',
    type: 'taxCard',
    documentNumber: '442-119-806',
    issuer: 'Egyptian Tax Authority',
    expiresInDays: null,
    blocksPublishing: true,
    verificationStatus: 'rejected',
    rejectionReason: 'The card is for a different legal entity than the commercial register.',
  },
  // Inside seven days: the permit a boat cannot go out without.
  {
    vendorSlug: 'fanous-divers',
    type: 'operatingPermit',
    documentNumber: 'SSG-DIV-1180',
    issuer: 'South Sinai Governorate',
    expiresInDays: 3,
    blocksPublishing: true,
    verificationStatus: 'verified',
  },
  {
    vendorSlug: 'shamandura-boat-trips',
    type: 'boatLicence',
    documentNumber: 'EMA-SH-II-773',
    issuer: 'Egyptian Maritime Authority',
    expiresInDays: 11,
    blocksPublishing: true,
    verificationStatus: 'verified',
  },
  // A cylinder test: overdue stops that tank, not the whole centre.
  {
    vendorSlug: 'fanous-divers',
    type: 'other',
    documentNumber: 'HYDRO-2-CYL',
    issuer: 'CDWS approved test centre',
    expiresInDays: 17,
    blocksPublishing: false,
    verificationStatus: 'verified',
  },
  {
    vendorSlug: 'blue-beach-freediving',
    type: 'cdwsLicence',
    documentNumber: 'CDWS-FR-0642',
    issuer: 'Chamber of Diving and Watersports',
    expiresInDays: 38,
    blocksPublishing: true,
    verificationStatus: 'verified',
  },
  {
    vendorSlug: 'moya-yoga',
    type: 'commercialRegister',
    documentNumber: 'GAFI-90-33417',
    issuer: 'GAFI',
    expiresInDays: 80,
    blocksPublishing: false,
    verificationStatus: 'verified',
  },
  {
    vendorSlug: 'assalah-transfers',
    type: 'vehicleLicence',
    documentNumber: 'TD-MB-2-5518',
    issuer: 'Traffic Department',
    expiresInDays: 84,
    blocksPublishing: false,
    verificationStatus: 'verified',
  },
  {
    vendorSlug: 'sinai-nomads',
    type: 'diveAgencyAffiliation',
    documentNumber: 'PADI-S-24119',
    issuer: 'PADI',
    expiresInDays: 142,
    blocksPublishing: false,
    verificationStatus: 'verified',
  },
  // Waiting on the platform: the two rows the verification queue is for.
  {
    vendorSlug: 'assalah-transfers',
    type: 'commercialRegister',
    documentNumber: 'GAFI-90-41220',
    issuer: 'GAFI',
    expiresInDays: null,
    blocksPublishing: false,
    verificationStatus: 'inReview',
  },
  {
    vendorSlug: 'assalah-transfers',
    type: 'publicLiabilityInsurance',
    documentNumber: null,
    issuer: 'Not yet supplied',
    expiresInDays: null,
    blocksPublishing: true,
    verificationStatus: 'pending',
  },
];

export function documentExpiresOn(document: SeedVendorDocument): string | null {
  return document.expiresInDays === null ? null : inDays(document.expiresInDays);
}

export interface SeedCategory {
  readonly slug: string;
  readonly nameKey: string;
  readonly colorToken: string;
  readonly icon: string;
  readonly sortOrder: number;
}

/**
 * `colorToken` is a token *name*. The literal value lives in tokens.json and
 * nowhere else, so these are provisional until the design file lands and the
 * real palette names are read off it — see docs/FOUNDATION.md.
 */
export const CATEGORIES: readonly SeedCategory[] = [
  {
    slug: 'scuba-diving',
    nameKey: 'category.scubaDiving',
    colorToken: 'PROVISIONAL-category-scuba',
    icon: 'tank',
    sortOrder: 10,
  },
  {
    slug: 'freediving',
    nameKey: 'category.freediving',
    colorToken: 'PROVISIONAL-category-freediving',
    icon: 'monofin',
    sortOrder: 20,
  },
  {
    slug: 'snorkeling',
    nameKey: 'category.snorkeling',
    colorToken: 'PROVISIONAL-category-snorkeling',
    icon: 'mask',
    sortOrder: 30,
  },
  {
    slug: 'desert-safari',
    nameKey: 'category.desertSafari',
    colorToken: 'PROVISIONAL-category-desert',
    icon: 'jeep',
    sortOrder: 40,
  },
  {
    slug: 'kitesurfing',
    nameKey: 'category.kitesurfing',
    colorToken: 'PROVISIONAL-category-kite',
    icon: 'kite',
    sortOrder: 50,
  },
  {
    slug: 'wellness-yoga',
    nameKey: 'category.wellnessYoga',
    colorToken: 'PROVISIONAL-category-wellness',
    icon: 'lotus',
    sortOrder: 60,
  },
  {
    slug: 'bedouin-culture',
    nameKey: 'category.bedouinCulture',
    colorToken: 'PROVISIONAL-category-bedouin',
    icon: 'teapot',
    sortOrder: 70,
  },
  {
    slug: 'boat-trips',
    nameKey: 'category.boatTrips',
    colorToken: 'PROVISIONAL-category-boat',
    icon: 'boat',
    sortOrder: 80,
  },
  {
    slug: 'courses-certifications',
    nameKey: 'category.coursesCertifications',
    colorToken: 'PROVISIONAL-category-courses',
    icon: 'certificate',
    sortOrder: 90,
  },
  {
    slug: 'gear-rental',
    nameKey: 'category.gearRental',
    colorToken: 'PROVISIONAL-category-rental',
    icon: 'bcd',
    sortOrder: 100,
  },
  {
    slug: 'transfers',
    nameKey: 'category.transfers',
    colorToken: 'PROVISIONAL-category-transfers',
    icon: 'van',
    sortOrder: 110,
  },
  {
    slug: 'photography',
    nameKey: 'category.photography',
    colorToken: 'PROVISIONAL-category-photography',
    icon: 'camera',
    sortOrder: 120,
  },
];
