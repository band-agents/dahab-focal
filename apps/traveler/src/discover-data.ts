import type { CategoryMarkName, MarkName } from '@dahab/ui';

/**
 * Fixtures for the Discover tab (Board 04). There is no API wiring yet — see
 * HANDOVER.md §10 — so this is hand-written, honestly, the same way the admin
 * and vendor fixtures are: real Dahab content, shaped like the eventual query,
 * proven against no database.
 */

export const CATEGORY_ORDER: readonly CategoryMarkName[] = [
  'diving',
  'freediving',
  'snorkeling',
  'boatSea',
  'courses',
  'kiteWatersports',
  'foodCooking',
  'rentals',
  'desertSafari',
  'bedouinCulture',
  'wellnessYoga',
  'transfers',
];

export interface RecentSearch {
  readonly id: string;
  readonly mark: MarkName;
  /** What the traveller actually typed — their own text, not UI chrome. */
  readonly query: string;
  readonly resultCount: number;
  readonly categorySlug: CategoryMarkName;
}

export const RECENT_SEARCHES: readonly RecentSearch[] = [
  { id: 'r1', mark: 'fin', query: 'Shore dives near Masbat', resultCount: 14, categorySlug: 'diving' },
  { id: 'r2', mark: 'depth', query: 'Blue Hole, morning', resultCount: 6, categorySlug: 'diving' },
  { id: 'r3', mark: 'tea', query: 'Bedouin dinner, Friday', resultCount: 4, categorySlug: 'bedouinCulture' },
  {
    id: 'r4',
    mark: 'kite',
    query: 'Kite lesson for beginners',
    resultCount: 5,
    categorySlug: 'kiteWatersports',
  },
];

/** The Board 04 worked example: "two calm shore dives near Masbat, under EGP 1,500, back before 13:00". */
export const PARSED_QUERY = {
  text: 'two calm shore dives near Masbat, under EGP 1,500, back before 13:00',
  chips: [
    { kind: 'area', value: 'Masbat' },
    { kind: 'entry', value: 'Shore' },
    { kind: 'price', value: '≤ EGP 1,500' },
    { kind: 'backBefore', value: '13:00' },
  ],
  unparsed: ['unparsedAmbiguous', 'unparsedCertification'] as const,
} as const;

export interface DiveTrip {
  readonly id: string;
  readonly title: string;
  readonly operator: string;
  readonly rating: number;
  readonly meta: string;
  /** Integer minor units — CLAUDE.md: money is never a float. */
  readonly priceEGPMinor: number;
  readonly priceEURMinor: number;
  readonly mark: MarkName;
  /** The two shortlisted trips carry the compare toggle already on, per Board 04. */
  readonly comparing: boolean;
  readonly pin: { readonly x: `${number}%`; readonly y: `${number}%` };
}

export const DIVING_TRIPS: readonly DiveTrip[] = [
  {
    id: 't1',
    title: 'Two shore dives · The Bells',
    operator: 'Fanous Divers',
    rating: 4.9,
    meta: '4h · 09:30 · max 4 per guide · gear included',
    priceEGPMinor: 145000,
    priceEURMinor: 2700,
    mark: 'fin',
    comparing: true,
    pin: { x: '56%', y: '22%' },
  },
  {
    id: 't2',
    title: 'Eel Garden & Lighthouse',
    operator: 'Fanous Divers',
    rating: 4.9,
    meta: '3h · 10:00 · shore entry · back 13:00',
    priceEGPMinor: 119000,
    priceEURMinor: 2200,
    mark: 'mask',
    comparing: true,
    pin: { x: '48%', y: '44%' },
  },
  {
    id: 't3',
    title: 'Freedive session · Blue Hole',
    operator: 'Blue Beach Freediving',
    rating: 4.8,
    meta: '3h · 10:00 · flat calm · AIDA 2+',
    priceEGPMinor: 132000,
    priceEURMinor: 2500,
    mark: 'depth',
    comparing: false,
    pin: { x: '62%', y: '12%' },
  },
  {
    id: 't4',
    title: 'Guided snorkel · Eel Garden',
    operator: 'Shamandura Boat Trips',
    rating: 4.7,
    meta: '2h · 11:15 · shore entry · all levels',
    priceEGPMinor: 38000,
    priceEURMinor: 700,
    mark: 'sea',
    comparing: false,
    pin: { x: '48%', y: '44%' },
  },
];

export const COMPARE_ATTRIBUTE_COUNT = 68;

export const FILTER_ROWS: ReadonlyArray<{
  readonly key: string;
  readonly mark: MarkName;
  readonly value: string;
}> = [
  { key: 'entry', mark: 'diver', value: 'Shore' },
  { key: 'depth', mark: 'depth', value: 'Up to 30 m' },
  { key: 'certification', mark: 'pass', value: 'Open Water and above' },
  { key: 'duration', mark: 'sun', value: '2–4 hours' },
  { key: 'price', mark: 'tea', value: 'Up to EGP 1,500' },
  { key: 'included', mark: 'tank', value: 'Gear · marine park fee' },
];

export const SORT_KEYS = ['earliest', 'priceAsc', 'rating', 'closest', 'fewestDivers'] as const;
export const SORT_MARKS: Record<(typeof SORT_KEYS)[number], MarkName> = {
  earliest: 'sun',
  priceAsc: 'tank',
  rating: 'star',
  closest: 'compass',
  fewestDivers: 'diver',
};

export const HUB = {
  diving: {
    slug: 'diving',
    mark: 'diving' as CategoryMarkName,
    trips: 38,
    operatorCount: 11,
    chips: ['shoreEntry', 'boat', 'nightDive', 'nitrox', 'course'],
    sites: [
      { name: 'The Bells', meta: 'Wall · 6–56 m', mark: 'fin' as MarkName },
      { name: 'El Canyon', meta: 'Canyon · 12–35 m', mark: 'canyon' as MarkName },
      { name: 'Gabr El Bint', meta: 'Boat · 8–40 m', mark: 'sail' as MarkName },
      { name: 'Umm Sid', meta: 'Reef · 5–25 m', mark: 'fish' as MarkName },
    ],
    operators: [
      { name: 'Fanous Divers', meta: 'Masbat · 4.9 · 128 reviews', mark: 'tank' as MarkName },
      { name: 'Blue Beach Freediving', meta: 'Assalah · 4.8 · 64 reviews', mark: 'depth' as MarkName },
      { name: 'Shamandura Boat Trips', meta: 'Mashraba · 4.7 · 41 reviews', mark: 'sail' as MarkName },
    ],
    noFlyFlight: '2026-09-17T06:20:00+02:00',
  },
} as const;

export const BLUE_HOLE = {
  slug: 'blue-hole',
  name: 'Blue Hole',
  meta: 'Shore entry · 8 min north of Assalah',
  body:
    'You walk in from the rim. Most dives go out over the saddle at 6 m and come back the same way; the Arch sits at 56 m and is a technical dive, not simply a deep one.',
  saddleM: 6,
  archM: 56,
  floorM: 100,
  facts: [
    { mark: 'sea' as MarkName, text: 'Water 22 °C in January, 28 °C in August' },
    { mark: 'mask' as MarkName, text: 'Visibility 25 m this morning, no wind' },
    { mark: 'chamber' as MarkName, text: 'Hyperbaric chamber 6 minutes away in Dahab' },
  ],
  certification: 'Advanced Open Water',
  loggedDives: 41,
  tripsHere: 7,
} as const;

export const ASK_BAHRI_THREAD: ReadonlyArray<{ readonly from: 'traveler' | 'bahri'; readonly text: string }> = [
  { from: 'traveler', text: 'Two calm shore dives near Masbat, under EGP 1,500, back before 13:00.' },
  {
    from: 'bahri',
    text:
      'Three trips fit. The closest is Two shore dives at the Bells with Fanous Divers, 09:30 to 13:30 — that is 30 minutes past your return time.',
  },
  { from: 'traveler', text: 'Anything that ends earlier?' },
  {
    from: 'bahri',
    text:
      'Eel Garden and Lighthouse, also Fanous Divers, 10:00 to 13:00, EGP 1,190 (≈ EUR 22). Gear included, marine park fee not.',
  },
];

export const ASK_BAHRI_SUGGESTIONS = ['showBoth', 'whatsNotIncluded', 'freedivingInstead'] as const;
