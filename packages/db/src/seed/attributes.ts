/**
 * The attribute schema — the thing that makes comparison possible.
 *
 * These rows are seeded into `attribute_definitions`. The admin taxonomy
 * manager edits them, the vendor service builder renders them as a form, and
 * the traveler comparison engine reads them. Nothing here is a column on
 * `services`, and nothing here should ever become one (CLAUDE.md).
 */

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

export interface SeedAttributeOption {
  readonly value: string;
  readonly labelKey: string;
  readonly sortOrder: number;
}

export interface SeedAttribute {
  readonly key: string;
  readonly labelKey: string;
  readonly dataType: AttributeDataType;
  readonly unit: string | null;
  readonly isRequired: boolean;
  readonly isComparable: boolean;
  readonly comparisonGroup: string | null;
  readonly comparisonOrder: number;
  readonly normalizationRule: { kind: string; factor?: number };
  readonly options: readonly SeedAttributeOption[];
}

const NONE = { kind: 'none' } as const;

function inclusion(key: string, order: number): SeedAttribute {
  return {
    key,
    labelKey: `attribute.diving.${toCamel(key)}`,
    dataType: 'boolean',
    unit: null,
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'inclusions',
    comparisonOrder: order,
    normalizationRule: NONE,
    options: [],
  };
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

/**
 * The inclusions matrix: 25 yes/no facts that decide whether two dive prices
 * are actually comparable. Two operators quoting 1,400 EGP are not offering
 * the same thing if one includes tanks, weights, a guide and lunch and the
 * other includes none of them — and until this matrix exists, the traveler
 * has no way to see that.
 */
export const DIVING_INCLUSIONS: readonly SeedAttribute[] = [
  inclusion('includes_full_equipment_set', 1),
  inclusion('includes_wetsuit', 2),
  inclusion('includes_bcd', 3),
  inclusion('includes_regulator', 4),
  inclusion('includes_mask_fins_snorkel', 5),
  inclusion('includes_dive_computer', 6),
  inclusion('includes_torch', 7),
  inclusion('includes_weights', 8),
  inclusion('includes_tanks', 9),
  inclusion('includes_nitrox', 10),
  inclusion('includes_guide', 11),
  inclusion('includes_private_guide', 12),
  inclusion('includes_instructor_supervision', 13),
  inclusion('includes_hotel_pickup', 14),
  inclusion('includes_land_transport', 15),
  inclusion('includes_boat_transfer', 16),
  inclusion('includes_camel_transfer', 17),
  inclusion('includes_lunch', 18),
  inclusion('includes_soft_drinks', 19),
  inclusion('includes_drinking_water', 20),
  inclusion('includes_snacks', 21),
  inclusion('includes_marine_park_fees', 22),
  inclusion('includes_bedouin_camp_fees', 23),
  inclusion('includes_dive_insurance', 24),
  inclusion('includes_photos', 25),
];

/** The rest of the diving schema: what is compared, and on what axis. */
export const DIVING_ATTRIBUTES: readonly SeedAttribute[] = [
  {
    key: 'dive_count',
    labelKey: 'attribute.diving.diveCount',
    dataType: 'number',
    unit: null,
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'profile',
    comparisonOrder: 1,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'max_depth_m',
    labelKey: 'attribute.diving.maxDepth',
    dataType: 'measure',
    unit: 'm',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'profile',
    comparisonOrder: 2,
    // Some operators still quote feet. Everything lands in metres.
    normalizationRule: { kind: 'toMetres' },
    options: [],
  },
  {
    key: 'bottom_time_min',
    labelKey: 'attribute.diving.bottomTime',
    dataType: 'duration',
    unit: 'min',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'profile',
    comparisonOrder: 3,
    // "40 minutes" and "1 hour" have to sort against each other.
    normalizationRule: { kind: 'toMinutes' },
    options: [],
  },
  {
    key: 'min_certification',
    labelKey: 'attribute.diving.minCertification',
    dataType: 'enum',
    unit: null,
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'requirements',
    comparisonOrder: 1,
    normalizationRule: NONE,
    options: [
      { value: 'none', labelKey: 'certLevel.none', sortOrder: 1 },
      { value: 'discover_scuba', labelKey: 'certLevel.discoverScuba', sortOrder: 2 },
      { value: 'open_water', labelKey: 'certLevel.openWater', sortOrder: 3 },
      { value: 'advanced_open_water', labelKey: 'certLevel.advancedOpenWater', sortOrder: 4 },
      { value: 'rescue', labelKey: 'certLevel.rescue', sortOrder: 5 },
      { value: 'deep_specialty', labelKey: 'certLevel.deepSpecialty', sortOrder: 6 },
      { value: 'technical', labelKey: 'certLevel.technical', sortOrder: 7 },
      { value: 'trimix', labelKey: 'certLevel.trimix', sortOrder: 8 },
    ],
  },
  {
    key: 'min_logged_dives',
    labelKey: 'attribute.diving.minLoggedDives',
    dataType: 'number',
    unit: null,
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'requirements',
    comparisonOrder: 2,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'guide_ratio',
    labelKey: 'attribute.diving.guideRatio',
    dataType: 'measure',
    unit: 'divers_per_guide',
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'guiding',
    comparisonOrder: 1,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'max_group_size',
    labelKey: 'attribute.diving.maxGroupSize',
    dataType: 'number',
    unit: null,
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'guiding',
    comparisonOrder: 2,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'guide_languages',
    labelKey: 'attribute.diving.guideLanguages',
    dataType: 'multiEnum',
    unit: null,
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'guiding',
    comparisonOrder: 3,
    normalizationRule: NONE,
    options: [
      { value: 'ar', labelKey: 'language.ar', sortOrder: 1 },
      { value: 'en', labelKey: 'language.en', sortOrder: 2 },
      { value: 'ru', labelKey: 'language.ru', sortOrder: 3 },
      { value: 'it', labelKey: 'language.it', sortOrder: 4 },
      { value: 'fr', labelKey: 'language.fr', sortOrder: 5 },
      { value: 'es', labelKey: 'language.es', sortOrder: 6 },
      { value: 'de', labelKey: 'language.de', sortOrder: 7 },
    ],
  },
  {
    key: 'entry_type',
    labelKey: 'attribute.diving.entryType',
    dataType: 'enum',
    unit: null,
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'logistics',
    comparisonOrder: 1,
    normalizationRule: NONE,
    options: [
      { value: 'shore', labelKey: 'entryType.shore', sortOrder: 1 },
      { value: 'boat', labelKey: 'entryType.boat', sortOrder: 2 },
      { value: 'both', labelKey: 'entryType.both', sortOrder: 3 },
    ],
  },
  {
    key: 'departure_time',
    labelKey: 'attribute.diving.departureTime',
    dataType: 'text',
    unit: null,
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'logistics',
    comparisonOrder: 2,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'night_dive',
    labelKey: 'attribute.diving.nightDive',
    dataType: 'boolean',
    unit: null,
    isRequired: false,
    isComparable: true,
    comparisonGroup: 'logistics',
    comparisonOrder: 3,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'no_fly_hours',
    labelKey: 'attribute.diving.noFlyHours',
    dataType: 'measure',
    unit: 'h',
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'safety',
    comparisonOrder: 1,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'oxygen_on_site',
    labelKey: 'attribute.diving.oxygenOnSite',
    dataType: 'boolean',
    unit: null,
    isRequired: true,
    isComparable: true,
    comparisonGroup: 'safety',
    comparisonOrder: 2,
    normalizationRule: NONE,
    options: [],
  },
  {
    key: 'briefing_languages',
    labelKey: 'attribute.diving.briefingLanguages',
    dataType: 'multiEnum',
    unit: null,
    isRequired: false,
    isComparable: false,
    comparisonGroup: null,
    comparisonOrder: 0,
    normalizationRule: NONE,
    options: [],
  },
];

/**
 * A smaller, honest schema for the other categories. Each one has the
 * attributes that actually decide a choice in Dahab; they will grow as the
 * admin taxonomy manager gets used, which is the point of holding them as
 * data.
 */
export const CATEGORY_ATTRIBUTES: Readonly<Record<string, readonly SeedAttribute[]>> = {
  'scuba-diving': [...DIVING_ATTRIBUTES, ...DIVING_INCLUSIONS],

  freediving: [
    {
      key: 'discipline',
      labelKey: 'attribute.freediving.discipline',
      dataType: 'multiEnum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'profile',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'cwt', labelKey: 'discipline.constantWeight', sortOrder: 1 },
        { value: 'fim', labelKey: 'discipline.freeImmersion', sortOrder: 2 },
        { value: 'sta', labelKey: 'discipline.static', sortOrder: 3 },
        { value: 'dyn', labelKey: 'discipline.dynamic', sortOrder: 4 },
      ],
    },
    {
      key: 'target_depth_m',
      labelKey: 'attribute.freediving.targetDepth',
      dataType: 'measure',
      unit: 'm',
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'profile',
      comparisonOrder: 2,
      normalizationRule: { kind: 'toMetres' },
      options: [],
    },
    {
      key: 'includes_safety_diver',
      labelKey: 'attribute.freediving.includesSafetyDiver',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'safety',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_line_and_buoy',
      labelKey: 'attribute.freediving.includesLineAndBuoy',
      dataType: 'boolean',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
  ],

  snorkeling: [
    {
      key: 'includes_equipment',
      labelKey: 'attribute.snorkeling.includesEquipment',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'guided',
      labelKey: 'attribute.snorkeling.guided',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'guiding',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'suitable_for_non_swimmers',
      labelKey: 'attribute.snorkeling.suitableForNonSwimmers',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'requirements',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
  ],

  'desert-safari': [
    {
      key: 'vehicle_type',
      labelKey: 'attribute.safari.vehicleType',
      dataType: 'enum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'logistics',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'jeep', labelKey: 'vehicle.jeep', sortOrder: 1 },
        { value: 'quad', labelKey: 'vehicle.quad', sortOrder: 2 },
        { value: 'camel', labelKey: 'vehicle.camel', sortOrder: 3 },
        { value: 'on_foot', labelKey: 'vehicle.onFoot', sortOrder: 4 },
      ],
    },
    {
      key: 'includes_overnight',
      labelKey: 'attribute.safari.includesOvernight',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_bedouin_dinner',
      labelKey: 'attribute.safari.includesBedouinDinner',
      dataType: 'boolean',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 2,
      normalizationRule: NONE,
      options: [],
    },
  ],

  kitesurfing: [
    {
      key: 'wind_season',
      labelKey: 'attribute.kite.windSeason',
      dataType: 'text',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'conditions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_kite_and_board',
      labelKey: 'attribute.kite.includesKiteAndBoard',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_radio_helmet',
      labelKey: 'attribute.kite.includesRadioHelmet',
      dataType: 'boolean',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 2,
      normalizationRule: NONE,
      options: [],
    },
  ],

  'wellness-yoga': [
    {
      key: 'style',
      labelKey: 'attribute.wellness.style',
      dataType: 'enum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'profile',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'hatha', labelKey: 'yogaStyle.hatha', sortOrder: 1 },
        { value: 'vinyasa', labelKey: 'yogaStyle.vinyasa', sortOrder: 2 },
        { value: 'yin', labelKey: 'yogaStyle.yin', sortOrder: 3 },
        { value: 'breathwork', labelKey: 'yogaStyle.breathwork', sortOrder: 4 },
      ],
    },
    {
      key: 'includes_mat',
      labelKey: 'attribute.wellness.includesMat',
      dataType: 'boolean',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
  ],

  'bedouin-culture': [
    {
      key: 'includes_meal',
      labelKey: 'attribute.bedouin.includesMeal',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'host_community',
      labelKey: 'attribute.bedouin.hostCommunity',
      dataType: 'text',
      unit: null,
      isRequired: false,
      isComparable: false,
      comparisonGroup: null,
      comparisonOrder: 0,
      normalizationRule: NONE,
      options: [],
    },
  ],

  'boat-trips': [
    {
      key: 'boat_capacity',
      labelKey: 'attribute.boat.capacity',
      dataType: 'number',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'logistics',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_lunch',
      labelKey: 'attribute.boat.includesLunch',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'has_shade',
      labelKey: 'attribute.boat.hasShade',
      dataType: 'boolean',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'comfort',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
  ],

  'courses-certifications': [
    {
      key: 'agency',
      labelKey: 'attribute.course.agency',
      dataType: 'enum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'certification',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'padi', labelKey: 'agency.padi', sortOrder: 1 },
        { value: 'ssi', labelKey: 'agency.ssi', sortOrder: 2 },
        { value: 'cmas', labelKey: 'agency.cmas', sortOrder: 3 },
        { value: 'raid', labelKey: 'agency.raid', sortOrder: 4 },
        { value: 'tdi', labelKey: 'agency.tdi', sortOrder: 5 },
        { value: 'aida', labelKey: 'agency.aida', sortOrder: 6 },
        { value: 'molchanovs', labelKey: 'agency.molchanovs', sortOrder: 7 },
      ],
    },
    {
      key: 'course_days',
      labelKey: 'attribute.course.days',
      dataType: 'number',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'profile',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_certification_fee',
      labelKey: 'attribute.course.includesCertificationFee',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'includes_materials',
      labelKey: 'attribute.course.includesMaterials',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'inclusions',
      comparisonOrder: 2,
      normalizationRule: NONE,
      options: [],
    },
  ],

  'gear-rental': [
    {
      key: 'rental_unit',
      labelKey: 'attribute.rental.unit',
      dataType: 'enum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'terms',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'per_day', labelKey: 'rentalUnit.perDay', sortOrder: 1 },
        { value: 'per_week', labelKey: 'rentalUnit.perWeek', sortOrder: 2 },
      ],
    },
    {
      key: 'deposit_required',
      labelKey: 'attribute.rental.depositRequired',
      dataType: 'boolean',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'terms',
      comparisonOrder: 2,
      normalizationRule: NONE,
      options: [],
    },
  ],

  transfers: [
    {
      key: 'route',
      labelKey: 'attribute.transfer.route',
      dataType: 'enum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'logistics',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'ssh_airport', labelKey: 'route.sharmAirport', sortOrder: 1 },
        { value: 'taba_airport', labelKey: 'route.tabaAirport', sortOrder: 2 },
        { value: 'cairo', labelKey: 'route.cairo', sortOrder: 3 },
        { value: 'nuweiba_port', labelKey: 'route.nuweibaPort', sortOrder: 4 },
      ],
    },
    {
      key: 'vehicle_seats',
      labelKey: 'attribute.transfer.vehicleSeats',
      dataType: 'number',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'logistics',
      comparisonOrder: 2,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'meets_at_arrivals',
      labelKey: 'attribute.transfer.meetsAtArrivals',
      dataType: 'boolean',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'service',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
  ],

  photography: [
    {
      key: 'setting',
      labelKey: 'attribute.photography.setting',
      dataType: 'enum',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'profile',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [
        { value: 'underwater', labelKey: 'photoSetting.underwater', sortOrder: 1 },
        { value: 'desert', labelKey: 'photoSetting.desert', sortOrder: 2 },
        { value: 'shoreline', labelKey: 'photoSetting.shoreline', sortOrder: 3 },
      ],
    },
    {
      key: 'edited_images_count',
      labelKey: 'attribute.photography.editedImagesCount',
      dataType: 'number',
      unit: null,
      isRequired: true,
      isComparable: true,
      comparisonGroup: 'deliverables',
      comparisonOrder: 1,
      normalizationRule: NONE,
      options: [],
    },
    {
      key: 'delivery_days',
      labelKey: 'attribute.photography.deliveryDays',
      dataType: 'number',
      unit: null,
      isRequired: false,
      isComparable: true,
      comparisonGroup: 'deliverables',
      comparisonOrder: 2,
      normalizationRule: NONE,
      options: [],
    },
  ],
};
