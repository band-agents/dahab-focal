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
];

export interface SeedVendor {
  readonly slug: string;
  readonly legalName: string;
  readonly displayName: string;
  readonly neighborhood: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly categorySlugs: readonly string[];
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
  },
  {
    slug: 'blue-beach-freediving',
    legalName: 'Blue Beach Freediving',
    displayName: 'Blue Beach Freediving',
    neighborhood: 'blue-beach',
    latitude: 28.4903,
    longitude: 34.5124,
    categorySlugs: ['freediving', 'courses-certifications'],
  },
  {
    slug: 'sinai-nomads',
    legalName: 'Sinai Nomads Tourism',
    displayName: 'Sinai Nomads',
    neighborhood: 'assalah',
    latitude: 28.5079,
    longitude: 34.5163,
    categorySlugs: ['desert-safari', 'bedouin-culture'],
  },
  {
    slug: 'baraka-kite',
    legalName: 'Baraka Kite Centre',
    displayName: 'Baraka Kite',
    neighborhood: 'blue-beach',
    latitude: 28.4885,
    longitude: 34.5108,
    categorySlugs: ['kitesurfing', 'gear-rental', 'courses-certifications'],
  },
  {
    slug: 'moya-yoga',
    legalName: 'Moya Yoga Studio',
    displayName: 'Moya Yoga',
    neighborhood: 'mashraba',
    latitude: 28.4961,
    longitude: 34.5147,
    categorySlugs: ['wellness-yoga'],
  },
  {
    slug: 'shamandura-boat-trips',
    legalName: 'Shamandura for Marine Trips',
    displayName: 'Shamandura Boat Trips',
    neighborhood: 'masbat',
    latitude: 28.5131,
    longitude: 34.5189,
    categorySlugs: ['boat-trips', 'snorkeling'],
  },
  {
    slug: 'assalah-transfers',
    legalName: 'Assalah Transfers',
    displayName: 'Assalah Transfers',
    neighborhood: 'assalah',
    latitude: 28.5071,
    longitude: 34.5159,
    categorySlugs: ['transfers'],
  },
];

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
