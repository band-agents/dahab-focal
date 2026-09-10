/**
 * Taxonomy fixtures.
 *
 * These mirror `attribute_definitions` and `services` from packages/db,
 * including the seeded diving attributes, because this screen is the one that
 * decides whether comparable attributes stay DATA. A hardcoded column on
 * `services` could serve none of the three surfaces that read this table — the
 * admin taxonomy manager, the vendor service builder and the traveler
 * comparison engine — and the comparison feature could never ship on top of
 * one.
 */

/** `attribute_data_type` */
export type AttributeDataType =
  | 'text'
  | 'longText'
  | 'number'
  | 'measure'
  | 'boolean'
  | 'enum'
  | 'multiEnum'
  | 'duration'
  | 'date';

/** `service_status` */
export type ServiceStatus =
  | 'draft'
  | 'underReview'
  | 'published'
  | 'paused'
  | 'archived'
  | 'rejected';

export interface AttributeDefinition {
  readonly id: string;
  readonly categorySlug: string;
  /** Machine key: `max_depth_m`, `includes_equipment`, `guide_ratio`. */
  readonly key: string;
  readonly dataType: AttributeDataType;
  /** Canonical unit for `measure`: "m", "min", "h". */
  readonly unit?: string;
  readonly isRequired: boolean;
  /** Only comparable attributes reach the traveler comparison table. */
  readonly isComparable: boolean;
  readonly comparisonGroup?: string;
  /**
   * What lets two operators who answered "40 minutes" and "1 hour" land on
   * the same axis. `none` means the value is already canonical.
   */
  readonly normalization: string;
  /** How many published services carry a value for this attribute. */
  readonly valuesOnServices: number;
  /** Options count for enum / multiEnum; zero for every other type. */
  readonly options: number;
}

/** The diving category's definitions, as seeded. */
export const ATTRIBUTES: readonly AttributeDefinition[] = [
  {
    id: 'a-1',
    categorySlug: 'diving',
    key: 'dive_count',
    dataType: 'number',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'profile',
    normalization: 'none',
    valuesOnServices: 41,
    options: 0,
  },
  {
    id: 'a-2',
    categorySlug: 'diving',
    key: 'max_depth_m',
    dataType: 'measure',
    unit: 'm',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'profile',
    normalization: 'toMetres',
    valuesOnServices: 41,
    options: 0,
  },
  {
    id: 'a-3',
    categorySlug: 'diving',
    key: 'bottom_time_min',
    dataType: 'duration',
    unit: 'min',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'profile',
    normalization: 'toMinutes',
    valuesOnServices: 38,
    options: 0,
  },
  {
    id: 'a-4',
    categorySlug: 'diving',
    key: 'min_certification',
    dataType: 'enum',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'requirements',
    normalization: 'certLevelOrder',
    valuesOnServices: 41,
    options: 7,
  },
  {
    id: 'a-5',
    categorySlug: 'diving',
    key: 'min_logged_dives',
    dataType: 'number',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'requirements',
    normalization: 'none',
    valuesOnServices: 29,
    options: 0,
  },
  {
    id: 'a-6',
    categorySlug: 'diving',
    key: 'required_gas',
    dataType: 'multiEnum',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'requirements',
    normalization: 'none',
    valuesOnServices: 22,
    options: 5,
  },
  {
    id: 'a-7',
    categorySlug: 'diving',
    key: 'guide_ratio',
    dataType: 'measure',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'guiding',
    normalization: 'ratioToOne',
    valuesOnServices: 41,
    options: 0,
  },
  {
    id: 'a-8',
    categorySlug: 'diving',
    key: 'max_group_size',
    dataType: 'number',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'guiding',
    normalization: 'none',
    valuesOnServices: 36,
    options: 0,
  },
  {
    id: 'a-9',
    categorySlug: 'diving',
    key: 'guide_languages',
    dataType: 'multiEnum',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'guiding',
    normalization: 'none',
    valuesOnServices: 40,
    options: 9,
  },
  {
    id: 'a-10',
    categorySlug: 'diving',
    key: 'entry_type',
    dataType: 'enum',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'logistics',
    normalization: 'none',
    valuesOnServices: 41,
    options: 3,
  },
  {
    id: 'a-11',
    categorySlug: 'diving',
    key: 'no_fly_hours',
    dataType: 'measure',
    unit: 'h',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'safety',
    normalization: 'toHours',
    valuesOnServices: 41,
    options: 0,
  },
  {
    id: 'a-12',
    categorySlug: 'diving',
    key: 'oxygen_on_site',
    dataType: 'boolean',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'safety',
    normalization: 'none',
    valuesOnServices: 41,
    options: 0,
  },
  {
    id: 'a-13',
    categorySlug: 'diving',
    key: 'includes_equipment',
    dataType: 'boolean',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'inclusions',
    normalization: 'none',
    valuesOnServices: 41,
    options: 0,
  },
  {
    id: 'a-14',
    categorySlug: 'diving',
    key: 'includes_lunch',
    dataType: 'boolean',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'inclusions',
    normalization: 'none',
    valuesOnServices: 33,
    options: 0,
  },
  {
    id: 'a-15',
    categorySlug: 'diving',
    key: 'briefing_languages',
    dataType: 'multiEnum',
    isRequired: false,
    // The one that is deliberately NOT comparable: it describes the service
    // rather than distinguishing it, and a comparison row nobody reads is a
    // row that makes the table worse.
    isComparable: false,
    normalization: 'none',
    valuesOnServices: 31,
    options: 9,
  },
];

/** The order the comparison table reads them in. */
export const COMPARISON_GROUPS = [
  'profile',
  'requirements',
  'guiding',
  'logistics',
  'safety',
  'inclusions',
] as const;

export interface ServiceReview {
  readonly id: string;
  readonly title: string;
  readonly vendor: string;
  readonly categorySlug: string;
  readonly status: ServiceStatus;
  readonly submitted: string;
  /** Comparable attributes still unanswered — what stops it being compared. */
  readonly missingComparable: number;
}

export const SERVICE_QUEUE: readonly ServiceReview[] = [
  {
    id: 's-1',
    title: 'Two shore dives · The Bells to the Blue Hole',
    vendor: 'Fanous Divers',
    categorySlug: 'diving',
    status: 'underReview',
    submitted: '2026-09-09',
    missingComparable: 0,
  },
  {
    id: 's-2',
    title: 'Night dive · Eel Garden',
    vendor: 'Fanous Divers',
    categorySlug: 'diving',
    status: 'underReview',
    submitted: '2026-09-10',
    missingComparable: 3,
  },
  {
    id: 's-3',
    title: 'Freedive coaching · Blue Hole line',
    vendor: 'Blue Beach Freediving',
    categorySlug: 'freediving',
    status: 'underReview',
    submitted: '2026-09-10',
    missingComparable: 1,
  },
  {
    id: 's-4',
    title: 'Ras Abu Galum by camel, overnight',
    vendor: 'Sinai Nomads',
    categorySlug: 'desert',
    status: 'draft',
    submitted: '2026-09-08',
    missingComparable: 6,
  },
  {
    id: 's-5',
    title: 'Kite lesson · Blue Lagoon flat water',
    vendor: 'Baraka Kite',
    categorySlug: 'kite',
    status: 'rejected',
    submitted: '2026-09-04',
    missingComparable: 2,
  },
];

/** Category totals for the taxonomy overview. */
export interface CategorySummary {
  readonly slug: string;
  readonly attributes: number;
  readonly comparable: number;
  readonly services: number;
}

export const CATEGORY_SUMMARY: readonly CategorySummary[] = [
  { slug: 'diving', attributes: 15, comparable: 14, services: 41 },
  { slug: 'freediving', attributes: 11, comparable: 10, services: 18 },
  { slug: 'snorkeling', attributes: 8, comparable: 7, services: 12 },
  { slug: 'boat', attributes: 9, comparable: 8, services: 14 },
  { slug: 'courses', attributes: 10, comparable: 9, services: 22 },
  { slug: 'kite', attributes: 9, comparable: 8, services: 9 },
  { slug: 'desert', attributes: 10, comparable: 9, services: 16 },
  { slug: 'bedouin', attributes: 7, comparable: 6, services: 11 },
  { slug: 'wellness', attributes: 6, comparable: 5, services: 8 },
  { slug: 'transfers', attributes: 6, comparable: 6, services: 7 },
];
