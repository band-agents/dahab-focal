import { SEED_TODAY, inDays } from './dahab.ts';

/**
 * The operating week.
 *
 * Everything above this file is a register: who the operators are, what the
 * dive sites are, which attributes a category compares. This file is what the
 * marketplace actually *did* — the services on sale, the boats going out this
 * morning, the people on them, the money that moved and the two things that
 * went wrong.
 *
 * It exists because the admin console cannot be evaluated against an empty
 * database. A screen that reads "no departures today" is indistinguishable
 * from a screen whose query is broken, and the whole console was built around
 * refusing exactly that ambiguity.
 *
 * The content is not invented for the seed: it is the Dahab in CLAUDE.md —
 * the real sites, the real neighbourhoods, the seven seeded operators — and
 * the figures are the ones the console's fixtures were already written
 * against, moved to where they belong. Travellers are named because a booking
 * with no name on it cannot exercise a manifest; they are the only fictional
 * thing here and they are obvious as such.
 *
 * Dates are all relative to SEED_TODAY, so re-seeding produces a live week
 * rather than a museum piece.
 */

export type SeedLocale = 'en-GB' | 'ar-EG' | 'ru-RU' | 'it-IT' | 'fr-FR' | 'es-ES' | 'de-DE';

export type SeedParticipantKind =
  | 'adult'
  | 'child'
  | 'infant'
  | 'student'
  | 'resident'
  | 'instructor';

export type SeedBookingStatus =
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

/**
 * The take rate and the provider fee moved to @dahab/api-contract, where the
 * refund path and the money screen read the same constants. Re-exported here
 * so every call site in the seed keeps working and there is still exactly one
 * definition.
 */
export {
  PAYMENT_FEE_BASIS_POINTS,
  TAKE_RATE_BASIS_POINTS,
  commissionMinor,
  paymentFeeMinor,
} from '@dahab/api-contract';

// --- Cairo wall clock -----------------------------------------------------

/**
 * The UTC instant of a Cairo wall-clock time.
 *
 * Departures are quoted in Cairo — "the 09:30 to the Bells" — and stored UTC.
 * Egypt reinstated summer time in 2023, so the offset is +2 or +3 depending on
 * the date and cannot be hardcoded. Resolving it through the IANA database is
 * the only answer that stays correct across a re-seed in April.
 */
export function cairoInstant(day: string, time: `${number}:${number}`): Date {
  const naive = new Date(`${day}T${time}:00Z`);
  // Two passes: the first offset is read at the wrong instant when the day
  // crosses a transition, the second is read at the corrected one.
  let instant = new Date(naive.getTime() - cairoOffsetMinutes(naive) * 60_000);
  instant = new Date(naive.getTime() - cairoOffsetMinutes(instant) * 60_000);
  return instant;
}

function cairoOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const field = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  // `Date.UTC` of the Cairo wall clock, minus the real instant, is the offset.
  const asUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour') === 24 ? 0 : field('hour'),
    field('minute'),
    field('second'),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** An instant N days from the seed's today, at a Cairo wall-clock time. */
export function cairoAt(dayOffset: number, time: `${number}:${number}`): Date {
  return cairoInstant(inDays(dayOffset), time);
}

/** An instant N days ago, to the minute. Used for audit and report times. */
export function hoursAgo(hours: number): Date {
  return new Date(SEED_TODAY.getTime() - hours * 3_600_000);
}

// --- Travellers -----------------------------------------------------------

/**
 * The people on the boats.
 *
 * Fictional, and the only fictional thing in the seed — a manifest with no
 * names on it cannot be read, and a booking with no traveller cannot be
 * refunded or disputed. Emails all sit on a `.invalid` domain so nothing here
 * can ever be mailed by accident.
 */
export interface SeedTraveler {
  readonly key: string;
  readonly fullName: string;
  readonly locale: SeedLocale;
  readonly phone: string;
}

export const TRAVELERS: readonly SeedTraveler[] = [
  { key: 'lena-fischer', fullName: 'Lena Fischer', locale: 'de-DE', phone: '+4915112340001' },
  { key: 'marco-rossi', fullName: 'Marco Rossi', locale: 'it-IT', phone: '+3934812340002' },
  { key: 'amira-saleh', fullName: 'Amira Saleh', locale: 'ar-EG', phone: '+2010012340003' },
  { key: 'yuki-tanaka', fullName: 'Yuki Tanaka', locale: 'en-GB', phone: '+8170012340004' },
  { key: 'sofia-marin', fullName: 'Sofía Marín', locale: 'es-ES', phone: '+3460012340005' },
  { key: 'tom-bakker', fullName: 'Tom Bakker', locale: 'en-GB', phone: '+3161012340006' },
  { key: 'nadia-haddad', fullName: 'Nadia Haddad', locale: 'fr-FR', phone: '+3361012340007' },
  { key: 'paul-girard', fullName: 'Paul Girard', locale: 'fr-FR', phone: '+3361012340008' },
  { key: 'irina-volkova', fullName: 'Irina Volkova', locale: 'ru-RU', phone: '+7910012340009' },
  { key: 'omar-fathy', fullName: 'Omar Fathy', locale: 'ar-EG', phone: '+2011012340010' },
  { key: 'hannah-price', fullName: 'Hannah Price', locale: 'en-GB', phone: '+4477012340011' },
  { key: 'mostafa-zaki', fullName: 'Mostafa Zaki', locale: 'ar-EG', phone: '+2012012340012' },
];

// --- Staff ----------------------------------------------------------------

export interface SeedStaff {
  readonly vendorSlug: string;
  readonly fullName: string;
  readonly jobTitle: string;
  readonly languages: readonly string[];
  /** Agency rating, and the date it lapses. Instructor ratings renew yearly. */
  readonly certification: {
    readonly agency: string;
    readonly level: string;
    readonly number: string;
    readonly expiresInDays: number;
  } | null;
}

export const STAFF: readonly SeedStaff[] = [
  {
    vendorSlug: 'fanous-divers',
    fullName: 'Hesham El Sayed',
    jobTitle: 'instructor',
    languages: ['ar-EG', 'en-GB', 'de-DE'],
    certification: { agency: 'PADI', level: 'OWSI', number: 'PADI-641204', expiresInDays: 142 },
  },
  {
    vendorSlug: 'fanous-divers',
    fullName: 'Karim Abdel Rahman',
    jobTitle: 'divemaster',
    languages: ['ar-EG', 'en-GB', 'ru-RU'],
    // Lapses in eleven days: this is the staff row the expiry board is for.
    certification: { agency: 'PADI', level: 'Divemaster', number: 'PADI-778120', expiresInDays: 11 },
  },
  {
    vendorSlug: 'fanous-divers',
    fullName: 'Mona Adly',
    jobTitle: 'receptionist',
    languages: ['ar-EG', 'en-GB', 'it-IT'],
    certification: null,
  },
  {
    vendorSlug: 'blue-beach-freediving',
    fullName: 'Yasmin Nasr',
    jobTitle: 'instructor',
    languages: ['ar-EG', 'en-GB', 'fr-FR'],
    certification: { agency: 'AIDA', level: 'Instructor', number: 'AIDA-20418', expiresInDays: 96 },
  },
  {
    vendorSlug: 'blue-beach-freediving',
    fullName: 'Antti Laine',
    jobTitle: 'safety diver',
    languages: ['en-GB', 'ru-RU'],
    certification: { agency: 'AIDA', level: 'AIDA 4', number: 'AIDA-33907', expiresInDays: 210 },
  },
  {
    vendorSlug: 'sinai-nomads',
    fullName: 'Salem Abu Zeid',
    jobTitle: 'guide',
    languages: ['ar-EG', 'en-GB'],
    certification: null,
  },
  {
    vendorSlug: 'sinai-nomads',
    fullName: 'Gharib Mansour',
    jobTitle: 'driver',
    languages: ['ar-EG'],
    certification: null,
  },
  {
    vendorSlug: 'shamandura-boat-trips',
    fullName: 'Ashraf Gomaa',
    jobTitle: 'skipper',
    languages: ['ar-EG', 'en-GB'],
    certification: {
      agency: 'Egyptian Maritime Authority',
      level: 'Coastal skipper',
      number: 'EMA-SK-4471',
      expiresInDays: 61,
    },
  },
  {
    vendorSlug: 'shamandura-boat-trips',
    fullName: 'Rami Sobhy',
    jobTitle: 'guide',
    languages: ['ar-EG', 'en-GB', 'es-ES'],
    certification: null,
  },
  {
    vendorSlug: 'moya-yoga',
    fullName: 'Dina Kamel',
    jobTitle: 'instructor',
    languages: ['ar-EG', 'en-GB'],
    certification: {
      agency: 'Yoga Alliance',
      level: 'RYT 500',
      number: 'YA-500-88214',
      expiresInDays: 174,
    },
  },
  {
    vendorSlug: 'baraka-kite',
    fullName: 'Tarek Shawky',
    jobTitle: 'instructor',
    languages: ['ar-EG', 'en-GB', 'ru-RU'],
    certification: { agency: 'IKO', level: 'Level 2', number: 'IKO-51188', expiresInDays: 44 },
  },
  {
    vendorSlug: 'assalah-transfers',
    fullName: 'Sameh Ibrahim',
    jobTitle: 'driver',
    languages: ['ar-EG', 'en-GB'],
    certification: null,
  },
];

// --- Resources ------------------------------------------------------------

export interface SeedResource {
  readonly vendorSlug: string;
  readonly key: string;
  readonly kind: 'boat' | 'vehicle' | 'tank' | 'kite' | 'board' | 'bcd' | 'other';
  readonly name: string;
  readonly identifier: string | null;
  readonly capacity: number;
  readonly specifications: Record<string, unknown> | null;
  /**
   * A cylinder out of hydrostatic test cannot legally be filled and a boat
   * without a current safety certificate cannot leave the jetty, so these are
   * gates on availability rather than maintenance notes.
   */
  readonly certification: { readonly kind: string; readonly number: string; readonly expiresInDays: number } | null;
}

export const RESOURCES: readonly SeedResource[] = [
  {
    vendorSlug: 'shamandura-boat-trips',
    key: 'shamandura-ii',
    kind: 'boat',
    name: 'Shamandura II',
    identifier: 'SSG-2291',
    capacity: 16,
    specifications: { lengthM: 14, shade: true, toilet: true },
    certification: { kind: 'boatSafety', number: 'SSG-BS-2291', expiresInDays: 11 },
  },
  {
    vendorSlug: 'fanous-divers',
    key: 'fanous-tanks-12l',
    kind: 'tank',
    name: '12 L aluminium cylinders',
    identifier: 'FD-12L-01..14',
    capacity: 14,
    specifications: { litres: 12, material: 'aluminium', valve: 'DIN' },
    certification: { kind: 'hydrostaticTest', number: 'CDWS-HT-9930', expiresInDays: 17 },
  },
  {
    vendorSlug: 'fanous-divers',
    key: 'fanous-van',
    kind: 'vehicle',
    name: 'Dive van to the Blue Hole',
    identifier: 'SSG-7714',
    capacity: 9,
    specifications: { tankRacks: 12 },
    certification: { kind: 'vehicleRoadworthiness', number: 'SSG-VR-7714', expiresInDays: 84 },
  },
  {
    vendorSlug: 'assalah-transfers',
    key: 'assalah-minibus-2',
    kind: 'vehicle',
    name: 'Minibus 2',
    identifier: 'SSG-3308',
    capacity: 14,
    specifications: { airConditioned: true },
    certification: { kind: 'vehicleRoadworthiness', number: 'SSG-VR-3308', expiresInDays: 84 },
  },
  {
    vendorSlug: 'baraka-kite',
    key: 'baraka-kites',
    kind: 'kite',
    name: 'School kites, 7 to 12 m',
    identifier: 'BK-K-01..08',
    capacity: 8,
    specifications: { sizesSqm: [7, 9, 10, 12] },
    certification: null,
  },
];

// --- Services -------------------------------------------------------------

export interface SeedServiceTranslation {
  readonly locale: SeedLocale;
  readonly title: string;
  readonly description: string;
  /** `human` or `machine`. The UI offers "show original" only for machine. */
  readonly origin: 'human' | 'machine';
}

export interface SeedService {
  readonly vendorSlug: string;
  readonly categorySlug: string;
  readonly slug: string;
  readonly status: 'draft' | 'underReview' | 'published' | 'paused' | 'archived' | 'rejected';
  readonly durationMinutes: number;
  readonly minParticipants: number;
  readonly maxParticipants: number;
  readonly bookingCutoffHours: number;
  /** 18 hours after a single dive, 24 after a multi-day course. Zero if dry. */
  readonly noFlyHours: number;
  /** Days before today the operator submitted it. Drives `createdAt`. */
  readonly submittedDaysAgo: number;
  readonly translations: readonly SeedServiceTranslation[];
  /**
   * Answers to the category's attribute definitions, keyed by machine key. A
   * published service answers everything comparable; one still under review
   * may not, and that gap is precisely what the catalogue queue counts.
   */
  readonly attributes: Readonly<Record<string, string | number | boolean | readonly string[]>>;
}

export const SERVICES: readonly SeedService[] = [
  {
    vendorSlug: 'fanous-divers',
    categorySlug: 'scuba-diving',
    slug: 'two-shore-dives-the-bells',
    status: 'published',
    durationMinutes: 300,
    minParticipants: 1,
    maxParticipants: 8,
    bookingCutoffHours: 12,
    noFlyHours: 18,
    submittedDaysAgo: 121,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Two shore dives · The Bells to the Blue Hole',
        description:
          'The classic Dahab drift. In through the Bells chimney at 27 m, along the wall past the Arch at a safe distance, out into the Blue Hole lagoon. Tanks, weights and a guide included; bring your own computer or rent one at the centre.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'غطستين من الشط · البيلز للبلو هول',
        description:
          'رحلة دهب المعروفة. الدخول من مدخنة البيلز على عمق ٢٧ متر، وبعدين على طول الحائط وبعيد عن القوس، والخروج في بحيرة البلو هول. الأنابيب والأوزان والمرشد داخل السعر؛ هات كمبيوتر الغطس بتاعك أو استأجر واحد من المركز.',
      },
      {
        locale: 'de-DE',
        origin: 'machine',
        title: 'Zwei Ufertauchgänge · The Bells zum Blue Hole',
        description:
          'Der klassische Dahab-Drift. Einstieg durch den Kamin von The Bells auf 27 m, an der Wand entlang in sicherem Abstand am Arch vorbei, Ausstieg in die Lagune des Blue Hole. Flaschen, Blei und Guide inklusive.',
      },
      {
        locale: 'ru-RU',
        origin: 'machine',
        title: 'Два погружения с берега · Беллс — Блю-Хоул',
        description:
          'Классический дахабский дрифт. Вход через колодец Беллс на 27 м, вдоль стены на безопасном расстоянии от Арки, выход в лагуну Блю-Хоул. Баллоны, грузы и гид включены.',
      },
    ],
    attributes: {
      dive_count: 2,
      max_depth_m: 30,
      bottom_time_min: 50,
      min_certification: 'advancedOpenWater',
      min_logged_dives: 20,
      required_gas: ['air', 'nitrox32'],
      guide_ratio: 4,
      max_group_size: 8,
      guide_languages: ['ar-EG', 'en-GB', 'de-DE'],
      entry_type: 'shore',
      departure_time: '09:30',
      night_dive: false,
      no_fly_hours: 18,
      oxygen_on_site: true,
      briefing_languages: ['ar-EG', 'en-GB', 'de-DE'],
      includes_full_equipment_set: false,
      includes_tanks: true,
      includes_weights: true,
      includes_guide: true,
      includes_land_transport: true,
      includes_drinking_water: true,
      includes_lunch: false,
      includes_marine_park_fees: true,
    },
  },
  {
    vendorSlug: 'fanous-divers',
    categorySlug: 'scuba-diving',
    slug: 'night-dive-eel-garden',
    // Under review with three comparable answers still missing — the row the
    // catalogue queue exists to surface.
    status: 'underReview',
    durationMinutes: 150,
    minParticipants: 2,
    maxParticipants: 6,
    bookingCutoffHours: 6,
    noFlyHours: 18,
    submittedDaysAgo: 1,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Night dive · Eel Garden',
        description:
          'Sunset entry over the sand, torches on as the garden eels retract and the Spanish dancers come out. Shallow, sheltered and the easiest night dive in Dahab.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'غطسة ليلية · جنينة الثعابين',
        description:
          'الدخول وقت الغروب فوق الرمل، والكشافات تولع لما ثعابين الرمل تختفي وترقص الراقصة الإسبانية. ضحلة ومحمية وأسهل غطسة ليلية في دهب.',
      },
    ],
    attributes: {
      dive_count: 1,
      max_depth_m: 14,
      min_certification: 'openWater',
      required_gas: ['air'],
      guide_ratio: 3,
      entry_type: 'shore',
      departure_time: '17:45',
      night_dive: true,
      no_fly_hours: 18,
      oxygen_on_site: true,
      includes_tanks: true,
      includes_weights: true,
      includes_guide: true,
      includes_torch: true,
    },
  },
  {
    vendorSlug: 'fanous-divers',
    categorySlug: 'courses-certifications',
    slug: 'padi-open-water',
    status: 'published',
    durationMinutes: 2400,
    minParticipants: 1,
    maxParticipants: 4,
    bookingCutoffHours: 48,
    // Four days of diving, so the no-fly window is the multi-day 24 hours.
    noFlyHours: 24,
    submittedDaysAgo: 96,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'PADI Open Water · four days',
        description:
          'Theory in the shade at the centre, confined water in the Lighthouse shallows, four open-water dives between Eel Garden and Umm Sid. Certification fee and manuals included.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'كورس PADI أوبن ووتر · أربع أيام',
        description:
          'الشرح في الضل في المركز، والتدريب في مياه اللايت هاوس الضحلة، وأربع غطسات مفتوحة بين جنينة الثعابين وأم سيد. رسوم الشهادة والكتب داخل السعر.',
      },
      {
        locale: 'de-DE',
        origin: 'machine',
        title: 'PADI Open Water · vier Tage',
        description:
          'Theorie im Schatten des Centers, Übungen im Flachwasser am Lighthouse, vier Freiwassertauchgänge zwischen Eel Garden und Umm Sid. Zertifizierungsgebühr und Lehrmaterial inklusive.',
      },
    ],
    attributes: {
      agency: 'padi',
      course_days: 4,
      includes_certification_fee: true,
      includes_materials: true,
    },
  },
  {
    vendorSlug: 'blue-beach-freediving',
    categorySlug: 'freediving',
    slug: 'freedive-session-blue-hole',
    status: 'published',
    durationMinutes: 180,
    minParticipants: 1,
    maxParticipants: 6,
    bookingCutoffHours: 12,
    noFlyHours: 0,
    submittedDaysAgo: 88,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Freedive session · Blue Hole line',
        description:
          'Flat-calm morning on the Blue Hole line, safety diver on every descent, buoy and lanyard provided. Depth is whatever you brought with you — nobody is pushed.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'جلسة غطس حر · حبل البلو هول',
        description:
          'صبحية بحر ساكن على حبل البلو هول، غطاس إنقاذ مع كل نزلة، والعوامة والحبل من عندنا. العمق على قد ما إنت جاهز — محدش بيتدفع.',
      },
      {
        locale: 'ru-RU',
        origin: 'machine',
        title: 'Фридайв-сессия · трос Блю-Хоул',
        description:
          'Штилевое утро на тросе Блю-Хоул, страхующий на каждом погружении, буй и лэньярд предоставляются. Глубина — ваша собственная, никто не подгоняет.',
      },
    ],
    attributes: {
      discipline: ['cwt', 'fim'],
      target_depth_m: 30,
      includes_safety_diver: true,
      includes_line_and_buoy: true,
    },
  },
  {
    vendorSlug: 'blue-beach-freediving',
    categorySlug: 'freediving',
    slug: 'freedive-coaching-blue-hole',
    status: 'underReview',
    durationMinutes: 240,
    minParticipants: 1,
    maxParticipants: 2,
    bookingCutoffHours: 24,
    noFlyHours: 0,
    submittedDaysAgo: 1,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Freedive coaching · one to one',
        description:
          'Video review on the beach, then two hours on the line working equalisation and turn technique. For divers already past 20 m who have stopped progressing.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'تدريب غطس حر · واحد لواحد',
        description:
          'مراجعة فيديو على الشط، وبعدين ساعتين على الحبل شغل على معادلة الضغط وتكنيك اللفة. للغطاسين اللي عدوا ٢٠ متر وواقفين مكانهم.',
      },
    ],
    attributes: {
      discipline: ['cwt'],
      includes_safety_diver: true,
      includes_line_and_buoy: true,
    },
  },
  {
    vendorSlug: 'sinai-nomads',
    categorySlug: 'desert-safari',
    slug: 'ras-abu-galum-overnight',
    status: 'published',
    durationMinutes: 1440,
    minParticipants: 2,
    maxParticipants: 10,
    bookingCutoffHours: 48,
    noFlyHours: 0,
    submittedDaysAgo: 3,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Ras Abu Galum by camel, overnight',
        description:
          'Camel north from the Blue Hole along the shoreline track, dinner and a mattress in the Bedouin camp at Ras Abu Galum, snorkel over the reef at first light before walking back.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'رأس أبو جالوم بالجمل · مبيت ليلة',
        description:
          'جمل من البلو هول شمال على طول طريق الساحل، عشا ومرتبة في كامب البدو في رأس أبو جالوم، وسنوركل فوق الشعب أول ما تطلع الشمس قبل ما نرجع مشي.',
      },
    ],
    attributes: {
      vehicle_type: 'camel',
      includes_overnight: true,
      includes_bedouin_dinner: true,
    },
  },
  {
    vendorSlug: 'sinai-nomads',
    categorySlug: 'bedouin-culture',
    slug: 'bedouin-dinner-wadi-gnai',
    status: 'published',
    durationMinutes: 240,
    minParticipants: 2,
    maxParticipants: 20,
    bookingCutoffHours: 24,
    noFlyHours: 0,
    submittedDaysAgo: 140,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Bedouin dinner · Wadi Gnai',
        description:
          'Jeep up the wadi before sunset, bread baked in the sand, chicken and rice with the Mzeina family who farm there, tea and the sky afterwards. Back in Dahab by ten.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'عشا بدوي · وادي جناي',
        description:
          'جيب طالع الوادي قبل الغروب، عيش مخبوز في الرمل، فراخ ورز مع عيلة المزينة اللي زارعين هناك، وشاي وسما بعد كده. راجعين دهب الساعة عشرة.',
      },
      {
        locale: 'de-DE',
        origin: 'machine',
        title: 'Beduinisches Abendessen · Wadi Gnai',
        description:
          'Mit dem Jeep vor Sonnenuntergang ins Wadi, im Sand gebackenes Brot, Hühnchen und Reis bei der Mzeina-Familie, danach Tee unter freiem Himmel. Gegen zehn zurück in Dahab.',
      },
    ],
    attributes: {
      includes_meal: true,
      host_community: 'Mzeina',
    },
  },
  {
    vendorSlug: 'shamandura-boat-trips',
    categorySlug: 'boat-trips',
    slug: 'islands-umm-sid-boat',
    status: 'published',
    durationMinutes: 420,
    minParticipants: 2,
    maxParticipants: 16,
    bookingCutoffHours: 18,
    noFlyHours: 0,
    submittedDaysAgo: 76,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Boat trip · The Islands & Umm Sid',
        description:
          'Out of Masbat at nine, two stops on the Islands coral heads and one at Umm Sid, lunch cooked on board, shade the whole way. Snorkel gear included; divers pay the marine park fee separately.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'رحلة مركب · الجزر وأم سيد',
        description:
          'خروج من مسبط الساعة تسعة، وقفتين على شعب الجزر ووقفة في أم سيد، غدا متطبوخ على المركب، وضل طول الطريق. عدة السنوركل داخل السعر؛ الغطاسين بيدفعوا رسوم المحمية لوحدها.',
      },
      {
        locale: 'ru-RU',
        origin: 'machine',
        title: 'Морская прогулка · Острова и Умм-Сид',
        description:
          'Отход из Масбата в девять, две остановки на кораллах Островов и одна у Умм-Сида, обед готовят на борту, тень всю дорогу. Снаряжение для снорклинга включено.',
      },
      {
        locale: 'de-DE',
        origin: 'machine',
        title: 'Bootsausflug · The Islands & Umm Sid',
        description:
          'Um neun ab Masbat, zwei Stopps an den Korallenblöcken der Islands und einer an Umm Sid, an Bord gekochtes Mittagessen, durchgehend Schatten. Schnorchelausrüstung inklusive.',
      },
    ],
    attributes: {
      boat_capacity: 16,
      includes_lunch: true,
      has_shade: true,
    },
  },
  {
    vendorSlug: 'shamandura-boat-trips',
    categorySlug: 'snorkeling',
    slug: 'snorkel-and-tea-eel-garden',
    status: 'published',
    durationMinutes: 150,
    minParticipants: 1,
    maxParticipants: 16,
    bookingCutoffHours: 4,
    noFlyHours: 0,
    submittedDaysAgo: 54,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Snorkel & tea · Eel Garden',
        description:
          'A short hop north to the Eel Garden shallows, mask and fins provided, a guide in the water with anyone who wants one, tea on the deck afterwards. Suitable for non-swimmers with a vest.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'سنوركل وشاي · جنينة الثعابين',
        description:
          'نقلة قصيرة شمال لضحل جنينة الثعابين، النضارة والزعانف من عندنا، ومرشد في المية مع أي حد عايز، وشاي على السطح بعدها. تنفع لغير العارفين العوم مع صديري.',
      },
    ],
    attributes: {
      includes_equipment: true,
      guided: true,
      suitable_for_non_swimmers: true,
    },
  },
  {
    vendorSlug: 'baraka-kite',
    categorySlug: 'kitesurfing',
    slug: 'kite-lesson-blue-lagoon',
    // Rejected while the centre is suspended: its liability cover lapsed.
    status: 'rejected',
    durationMinutes: 180,
    minParticipants: 1,
    maxParticipants: 4,
    bookingCutoffHours: 24,
    noFlyHours: 0,
    submittedDaysAgo: 7,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Kite lesson · Blue Lagoon flat water',
        description:
          'Transfer up to the Blue Lagoon, waist-deep flat water for the whole session, radio helmet so the instructor can talk you down. Kite, board and harness included.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'درس كايت · البلو لاجون',
        description:
          'انتقال للبلو لاجون، مية ساكنة لحد الوسط طول الجلسة، وخوذة بالراديو عشان المدرب يكلمك وإنت في المية. الطيارة واللوح والحزام داخل السعر.',
      },
    ],
    attributes: {
      wind_season: 'March to June',
      includes_kite_and_board: true,
      includes_radio_helmet: true,
    },
  },
  {
    vendorSlug: 'moya-yoga',
    categorySlug: 'wellness-yoga',
    slug: 'sunrise-yoga-lighthouse',
    status: 'published',
    durationMinutes: 75,
    minParticipants: 1,
    maxParticipants: 14,
    bookingCutoffHours: 2,
    noFlyHours: 0,
    submittedDaysAgo: 63,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Sunrise yoga · Lighthouse',
        description:
          'On the deck above the Lighthouse reef as the sun comes over Saudi. Hatha, slow, mats provided. Seventy-five minutes and you are in the water by eight.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'يوجا الشروق · اللايت هاوس',
        description:
          'على السطح فوق شعاب اللايت هاوس والشمس بتطلع من ناحية السعودية. هاثا، هادية، والمراتب من عندنا. خمسة وسبعين دقيقة وتكون في المية الساعة تمانية.',
      },
    ],
    attributes: {
      style: 'hatha',
      includes_mat: true,
    },
  },
  {
    vendorSlug: 'assalah-transfers',
    categorySlug: 'transfers',
    slug: 'sharm-airport-dahab',
    // The operator is still in review, so nothing of theirs is published.
    status: 'draft',
    durationMinutes: 90,
    minParticipants: 1,
    maxParticipants: 14,
    bookingCutoffHours: 6,
    noFlyHours: 0,
    submittedDaysAgo: 4,
    translations: [
      {
        locale: 'en-GB',
        origin: 'human',
        title: 'Sharm El Sheikh airport · Dahab',
        description:
          'Meet inside arrivals with a name board, air-conditioned minibus, one stop at the Nabq checkpoint. Ninety minutes to any address in Assalah, Masbat or Mashraba.',
      },
      {
        locale: 'ar-EG',
        origin: 'human',
        title: 'مطار شرم الشيخ · دهب',
        description:
          'الاستقبال جوه صالة الوصول بلافتة بالاسم، ميكروباص مكيف، ووقفة واحدة عند كمين نبق. ساعة ونص لأي عنوان في العسلة أو مسبط أو المشربة.',
      },
    ],
    attributes: {
      route: 'sshDahab',
      vehicle_seats: 14,
      meets_at_arrivals: true,
    },
  },
];

/**
 * Which sites a service actually visits, in the order it visits them.
 *
 * Held as its own table rather than a column because a boat trip stops at
 * two reefs and a course works through four, and because the traveller side
 * searches the other way round — "what can I book that goes to the Bells".
 * A dry service simply has no row here.
 */
export const SERVICE_DIVE_SITES: Readonly<Record<string, readonly string[]>> = {
  'two-shore-dives-the-bells': ['the-bells', 'blue-hole'],
  'night-dive-eel-garden': ['eel-garden'],
  'padi-open-water': ['lighthouse', 'eel-garden', 'umm-sid'],
  'freedive-session-blue-hole': ['blue-hole'],
  'freedive-coaching-blue-hole': ['blue-hole'],
  'ras-abu-galum-overnight': ['ras-abu-galum'],
  'islands-umm-sid-boat': ['the-islands', 'umm-sid'],
  'snorkel-and-tea-eel-garden': ['eel-garden'],
};

// --- Departures -----------------------------------------------------------

export interface SeedSlot {
  readonly key: string;
  readonly vendorSlug: string;
  readonly serviceSlug: string;
  readonly dayOffset: number;
  readonly startTime: `${number}:${number}`;
  readonly durationMinutes: number;
  readonly capacity: number;
  readonly resourceKey: string | null;
}

/**
 * The board for today and the two days either side of it.
 *
 * Today's four departures are the ones the console's Today screen was
 * designed around; the Thursday boat is the one a forecast is about to
 * cancel, which is why it carries the full sixteen seats.
 */
export const SLOTS: readonly SeedSlot[] = [
  {
    key: 'bells-today',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    dayOffset: 0,
    startTime: '09:30',
    durationMinutes: 300,
    capacity: 8,
    resourceKey: 'fanous-van',
  },
  {
    key: 'freedive-today',
    vendorSlug: 'blue-beach-freediving',
    serviceSlug: 'freedive-session-blue-hole',
    dayOffset: 0,
    startTime: '10:00',
    durationMinutes: 180,
    capacity: 6,
    resourceKey: null,
  },
  {
    key: 'snorkel-today',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'snorkel-and-tea-eel-garden',
    dayOffset: 0,
    startTime: '11:15',
    durationMinutes: 150,
    capacity: 16,
    resourceKey: 'shamandura-ii',
  },
  {
    key: 'camel-today',
    vendorSlug: 'sinai-nomads',
    serviceSlug: 'ras-abu-galum-overnight',
    dayOffset: 0,
    startTime: '13:00',
    durationMinutes: 1440,
    capacity: 10,
    resourceKey: null,
  },
  {
    key: 'bells-tomorrow',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    dayOffset: 1,
    startTime: '09:30',
    durationMinutes: 300,
    capacity: 8,
    resourceKey: 'fanous-van',
  },
  {
    key: 'islands-boat',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    dayOffset: 1,
    startTime: '09:00',
    durationMinutes: 420,
    capacity: 16,
    resourceKey: 'shamandura-ii',
  },
  {
    key: 'yoga-tomorrow',
    vendorSlug: 'moya-yoga',
    serviceSlug: 'sunrise-yoga-lighthouse',
    dayOffset: 1,
    startTime: '06:15',
    durationMinutes: 75,
    capacity: 14,
    resourceKey: null,
  },
];

/** The departure the forecast is about to take out, and the operator's limit. */
export const AT_RISK_SLOT_KEY = 'islands-boat';
export const AT_RISK_WIND_FORECAST_KT = 22;
export const AT_RISK_WIND_LIMIT_KT = 18;

// --- Bookings -------------------------------------------------------------

export interface SeedBooking {
  readonly reference: string;
  readonly travelerKey: string;
  readonly vendorSlug: string;
  readonly serviceSlug: string;
  /** Null for a booking that predates the generated slots. */
  readonly slotKey: string | null;
  readonly status: SeedBookingStatus;
  readonly dayOffset: number;
  readonly startTime: `${number}:${number}`;
  readonly party: Readonly<Partial<Record<SeedParticipantKind, number>>>;
  /** Integer minor units, EGP. Never a float, never a formatted string. */
  readonly totalMinor: number;
  readonly provider: 'paymob' | 'kashier' | 'paypal' | 'fawry' | 'instapay';
  readonly travelerNote: string | null;
}

/**
 * The per-head prices behind every total below, in piastres.
 *
 * Children pay 70% and Egyptian residents 75%; infants and an accompanying
 * instructor pay nothing but still hold a seat, which is the distinction the
 * boat's headcount depends on.
 */
export const PRICE_PER_ADULT_MINOR: Readonly<Record<string, number>> = {
  'two-shore-dives-the-bells': 145_000,
  'night-dive-eel-garden': 95_000,
  'padi-open-water': 1_450_000,
  'freedive-session-blue-hole': 76_000,
  'freedive-coaching-blue-hole': 210_000,
  'ras-abu-galum-overnight': 190_000,
  'bedouin-dinner-wadi-gnai': 48_000,
  'islands-umm-sid-boat': 132_000,
  'snorkel-and-tea-eel-garden': 55_000,
  'kite-lesson-blue-lagoon': 180_000,
  'sunrise-yoga-lighthouse': 25_000,
  'sharm-airport-dahab': 110_000,
};

export const CHILD_RATE_BASIS_POINTS = 7000;
export const RESIDENT_RATE_BASIS_POINTS = 7500;
export const STUDENT_RATE_BASIS_POINTS = 8500;

export const BOOKINGS: readonly SeedBooking[] = [
  // The Thursday boat: four bookings, three of them paid. DF-4474 is still
  // pendingPayment, which is why a cancellation refunds three and releases one.
  {
    reference: 'DF-4471',
    travelerKey: 'lena-fischer',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    slotKey: 'islands-boat',
    status: 'confirmed',
    dayOffset: 1,
    startTime: '09:00',
    party: { adult: 2 },
    totalMinor: 264_000,
    provider: 'paymob',
    travelerNote: null,
  },
  {
    reference: 'DF-4472',
    travelerKey: 'marco-rossi',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    slotKey: 'islands-boat',
    status: 'confirmed',
    dayOffset: 1,
    startTime: '09:00',
    party: { adult: 2, child: 1, infant: 1 },
    totalMinor: 356_400,
    provider: 'kashier',
    travelerNote: 'Travelling with a nine-month-old; we will bring our own vest.',
  },
  {
    reference: 'DF-4473',
    travelerKey: 'amira-saleh',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    slotKey: 'islands-boat',
    status: 'confirmed',
    dayOffset: 1,
    startTime: '09:00',
    party: { resident: 3 },
    totalMinor: 297_000,
    provider: 'instapay',
    travelerNote: null,
  },
  {
    reference: 'DF-4474',
    travelerKey: 'yuki-tanaka',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    slotKey: 'islands-boat',
    status: 'pendingPayment',
    dayOffset: 1,
    startTime: '09:00',
    party: { adult: 2 },
    totalMinor: 264_000,
    provider: 'fawry',
    travelerNote: null,
  },

  // Today.
  {
    reference: 'DF-4468',
    travelerKey: 'sofia-marin',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    slotKey: 'bells-today',
    status: 'awaitingVendor',
    dayOffset: 0,
    startTime: '09:30',
    party: { adult: 1, instructor: 1 },
    totalMinor: 145_000,
    provider: 'paymob',
    travelerNote: 'Last dive was fourteen months ago — happy to take a refresher first.',
  },
  {
    reference: 'DF-4469',
    travelerKey: 'hannah-price',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    slotKey: 'bells-today',
    status: 'confirmed',
    dayOffset: 0,
    startTime: '09:30',
    party: { adult: 3 },
    totalMinor: 435_000,
    provider: 'paypal',
    travelerNote: null,
  },
  {
    reference: 'DF-4470',
    travelerKey: 'irina-volkova',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    slotKey: 'bells-today',
    status: 'confirmed',
    dayOffset: 0,
    startTime: '09:30',
    party: { adult: 3 },
    totalMinor: 435_000,
    provider: 'paymob',
    travelerNote: null,
  },
  {
    reference: 'DF-4466',
    travelerKey: 'omar-fathy',
    vendorSlug: 'blue-beach-freediving',
    serviceSlug: 'freedive-session-blue-hole',
    slotKey: 'freedive-today',
    status: 'confirmed',
    dayOffset: 0,
    startTime: '10:00',
    party: { resident: 2, adult: 3 },
    totalMinor: 342_000,
    provider: 'instapay',
    travelerNote: null,
  },
  {
    reference: 'DF-4467',
    travelerKey: 'mostafa-zaki',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'snorkel-and-tea-eel-garden',
    slotKey: 'snorkel-today',
    status: 'confirmed',
    dayOffset: 0,
    startTime: '11:15',
    party: { adult: 6, child: 4, resident: 1 },
    totalMinor: 525_250,
    provider: 'fawry',
    travelerNote: 'Family group, two of the children cannot swim.',
  },
  {
    reference: 'DF-4465',
    travelerKey: 'tom-bakker',
    vendorSlug: 'sinai-nomads',
    serviceSlug: 'ras-abu-galum-overnight',
    slotKey: 'camel-today',
    status: 'confirmed',
    dayOffset: 0,
    startTime: '13:00',
    party: { adult: 6 },
    totalMinor: 1_140_000,
    provider: 'paypal',
    travelerNote: null,
  },

  // Behind us. These are what the money screens and the ratings read.
  {
    reference: 'DF-4455',
    travelerKey: 'tom-bakker',
    vendorSlug: 'sinai-nomads',
    serviceSlug: 'bedouin-dinner-wadi-gnai',
    slotKey: null,
    status: 'completed',
    dayOffset: -2,
    startTime: '17:30',
    party: { adult: 4 },
    totalMinor: 192_000,
    provider: 'paypal',
    travelerNote: null,
  },
  {
    reference: 'DF-4460',
    travelerKey: 'nadia-haddad',
    vendorSlug: 'baraka-kite',
    serviceSlug: 'kite-lesson-blue-lagoon',
    slotKey: null,
    // Disputed: the lesson ran without the promised radio helmet.
    status: 'disputed',
    dayOffset: -3,
    startTime: '15:00',
    party: { adult: 1 },
    totalMinor: 180_000,
    provider: 'paymob',
    travelerNote: null,
  },
  {
    reference: 'DF-4441',
    travelerKey: 'paul-girard',
    vendorSlug: 'blue-beach-freediving',
    serviceSlug: 'freedive-session-blue-hole',
    slotKey: null,
    status: 'refunded',
    dayOffset: -6,
    startTime: '09:00',
    party: { adult: 2 },
    totalMinor: 152_000,
    provider: 'kashier',
    travelerNote: null,
  },
  {
    reference: 'DF-4432',
    travelerKey: 'lena-fischer',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    slotKey: null,
    status: 'completed',
    dayOffset: -8,
    startTime: '09:30',
    party: { adult: 2 },
    totalMinor: 290_000,
    provider: 'paymob',
    travelerNote: null,
  },
  {
    reference: 'DF-4428',
    travelerKey: 'irina-volkova',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    slotKey: null,
    status: 'completed',
    dayOffset: -9,
    startTime: '09:00',
    party: { adult: 4 },
    totalMinor: 528_000,
    provider: 'kashier',
    travelerNote: null,
  },
  {
    reference: 'DF-4421',
    travelerKey: 'hannah-price',
    vendorSlug: 'moya-yoga',
    serviceSlug: 'sunrise-yoga-lighthouse',
    slotKey: null,
    status: 'completed',
    dayOffset: -10,
    startTime: '06:15',
    party: { adult: 1 },
    totalMinor: 25_000,
    provider: 'instapay',
    travelerNote: null,
  },
  {
    reference: 'DF-4415',
    travelerKey: 'omar-fathy',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'padi-open-water',
    slotKey: null,
    status: 'completed',
    dayOffset: -12,
    startTime: '09:00',
    party: { resident: 1 },
    totalMinor: 1_087_500,
    provider: 'instapay',
    travelerNote: null,
  },
  {
    reference: 'DF-4409',
    travelerKey: 'marco-rossi',
    vendorSlug: 'blue-beach-freediving',
    serviceSlug: 'freedive-session-blue-hole',
    slotKey: null,
    status: 'completed',
    dayOffset: -14,
    startTime: '10:00',
    party: { adult: 2 },
    totalMinor: 152_000,
    provider: 'paypal',
    travelerNote: null,
  },
  {
    reference: 'DF-4402',
    travelerKey: 'sofia-marin',
    vendorSlug: 'sinai-nomads',
    serviceSlug: 'bedouin-dinner-wadi-gnai',
    slotKey: null,
    status: 'completed',
    dayOffset: -16,
    startTime: '17:30',
    party: { adult: 2, child: 2 },
    totalMinor: 163_200,
    provider: 'kashier',
    travelerNote: null,
  },
  {
    reference: 'DF-4396',
    travelerKey: 'mostafa-zaki',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'snorkel-and-tea-eel-garden',
    slotKey: null,
    status: 'noShow',
    dayOffset: -17,
    startTime: '11:15',
    party: { adult: 2 },
    totalMinor: 110_000,
    provider: 'fawry',
    travelerNote: null,
  },
  {
    reference: 'DF-4388',
    travelerKey: 'yuki-tanaka',
    vendorSlug: 'fanous-divers',
    serviceSlug: 'two-shore-dives-the-bells',
    slotKey: null,
    status: 'completed',
    dayOffset: -19,
    startTime: '09:30',
    party: { adult: 1 },
    totalMinor: 145_000,
    provider: 'paypal',
    travelerNote: null,
  },
  {
    reference: 'DF-4377',
    travelerKey: 'amira-saleh',
    vendorSlug: 'moya-yoga',
    serviceSlug: 'sunrise-yoga-lighthouse',
    slotKey: null,
    status: 'completed',
    dayOffset: -21,
    startTime: '06:15',
    party: { resident: 2 },
    totalMinor: 37_500,
    provider: 'instapay',
    travelerNote: null,
  },
  {
    reference: 'DF-4361',
    travelerKey: 'paul-girard',
    vendorSlug: 'shamandura-boat-trips',
    serviceSlug: 'islands-umm-sid-boat',
    slotKey: null,
    status: 'cancelledByWeather',
    dayOffset: -24,
    startTime: '09:00',
    party: { adult: 2 },
    totalMinor: 264_000,
    provider: 'paymob',
    travelerNote: null,
  },
];

// --- Reviews --------------------------------------------------------------

export interface SeedReview {
  readonly bookingReference: string;
  readonly rating: number;
  readonly sourceLocale: SeedLocale;
  readonly moderationStatus: 'published' | 'pendingReview' | 'hidden' | 'removed';
  readonly title: string;
  readonly body: string;
  /** An English rendering where the review was not written in English. */
  readonly english: { readonly title: string; readonly body: string } | null;
  readonly vendorReply: string | null;
}

export const REVIEWS: readonly SeedReview[] = [
  {
    bookingReference: 'DF-4432',
    rating: 5,
    sourceLocale: 'de-DE',
    moderationStatus: 'published',
    title: 'Ruhig geführt, gute Briefings',
    body: 'Hesham hat den Einstieg durch den Kamin sehr ruhig gebrieft und uns am Arch bewusst oben gehalten. Flaschen waren voll, Blei passte, alles pünktlich.',
    english: {
      title: 'Calmly guided, good briefings',
      body: 'Hesham briefed the chimney entry very calmly and deliberately kept us above the Arch. Tanks full, weights right, everything on time.',
    },
    vendorReply: 'Thank you Lena — Hesham says the Arch will still be there when you have the ticket for it.',
  },
  {
    bookingReference: 'DF-4428',
    rating: 4,
    sourceLocale: 'ru-RU',
    moderationStatus: 'published',
    title: 'Хорошая лодка, обед простой',
    body: 'Тень на всей палубе, что в сентябре важнее всего. Обед простой, но горячий. Второй риф у Умм-Сида был лучше первого.',
    english: {
      title: 'Good boat, simple lunch',
      body: 'Shade across the whole deck, which matters most in September. Lunch simple but hot. The second reef at Umm Sid was better than the first.',
    },
    vendorReply: null,
  },
  {
    bookingReference: 'DF-4455',
    rating: 5,
    sourceLocale: 'en-GB',
    moderationStatus: 'published',
    title: 'The bread alone was worth it',
    body: 'Salem drove us up the wadi with the sun still on the rocks. Bread baked in the sand in front of us, and nobody rushed us out afterwards.',
    english: null,
    vendorReply: null,
  },
  {
    bookingReference: 'DF-4421',
    rating: 5,
    sourceLocale: 'en-GB',
    moderationStatus: 'published',
    title: 'Worth the alarm',
    body: 'Six fifteen is early but the light over the water is the reason to do it. Mats were clean and Dina keeps the pace slow.',
    english: null,
    vendorReply: 'See you next season, Hannah.',
  },
  {
    bookingReference: 'DF-4409',
    rating: 4,
    sourceLocale: 'it-IT',
    moderationStatus: 'published',
    title: 'Sicurezza seria',
    body: 'Un safety diver su ogni discesa, senza eccezioni. Mi sarebbe piaciuto più tempo sulla linea, ma la mattina era affollata.',
    english: {
      title: 'Serious about safety',
      body: 'A safety diver on every descent, no exceptions. I would have liked more time on the line, but the morning was busy.',
    },
    vendorReply: null,
  },
  {
    bookingReference: 'DF-4402',
    rating: 5,
    sourceLocale: 'es-ES',
    moderationStatus: 'published',
    title: 'Los niños no querían irse',
    body: 'La familia nos trató como invitados, no como clientes. Los niños ayudaron a enterrar el pan en la arena.',
    english: {
      title: 'The children did not want to leave',
      body: 'The family treated us as guests rather than customers. The children helped bury the bread in the sand.',
    },
    vendorReply: null,
  },
  {
    bookingReference: 'DF-4415',
    rating: 5,
    sourceLocale: 'ar-EG',
    moderationStatus: 'published',
    title: 'كورس مظبوط من غير استعجال',
    body: 'أربع أيام من غير ما حد يستعجلني. الشرح بالعربي والتدريب في اللايت هاوس كان هادي، والشهادة طلعت في نفس الأسبوع.',
    english: {
      title: 'A proper course, no rushing',
      body: 'Four days and nobody hurried me. The theory was in Arabic, the confined water at the Lighthouse was calm, and the certification came through the same week.',
    },
    vendorReply: null,
  },
  {
    bookingReference: 'DF-4388',
    rating: 3,
    sourceLocale: 'en-GB',
    moderationStatus: 'published',
    title: 'Good dive, crowded entry',
    body: 'The dive itself was exactly as described. The Bells car park at half nine is another matter — go earlier if you can.',
    english: null,
    vendorReply: 'Fair. We are moving the weekday departure to 08:30 from next month.',
  },
  {
    bookingReference: 'DF-4377',
    rating: 4,
    sourceLocale: 'ar-EG',
    moderationStatus: 'pendingReview',
    title: 'هادية أوي',
    body: 'الجلسة نفسها ممتازة بس السطح كان لسه مبلول من الليل. المراتب نضيفة.',
    english: {
      title: 'Very calm',
      body: 'The session itself is excellent but the deck was still wet from the night. The mats are clean.',
    },
    vendorReply: null,
  },
];

// --- Incidents and disputes ----------------------------------------------

export interface SeedIncident {
  readonly reference: string;
  readonly vendorSlug: string;
  readonly bookingReference: string | null;
  readonly kind:
    | 'divingIncident'
    | 'decompressionIllness'
    | 'equipmentFailure'
    | 'vesselIncident'
    | 'vehicleIncident'
    | 'medicalEmergency'
    | 'marineLifeInjury'
    | 'weatherEvent'
    | 'lostDiver'
    | 'other';
  readonly severity: 'nearMiss' | 'minor' | 'serious' | 'critical';
  readonly hoursAgo: number;
  readonly site: string;
  readonly narrative: string;
  readonly chamberTreatment: boolean;
  readonly diveProfile: Record<string, unknown> | null;
  readonly resolvedHoursAgo: number | null;
  readonly resolution: string | null;
}

/**
 * Two entries, both of the kind a dive centre actually files: a free-flowing
 * second stage and a buddy separation. Neither involved a casualty. Dahab has
 * a hyperbaric chamber and decompression illness is a real category in the
 * schema, but it is not something to invent into a demo database.
 */
export const INCIDENTS: readonly SeedIncident[] = [
  {
    reference: 'IN-2291',
    vendorSlug: 'fanous-divers',
    bookingReference: 'DF-4432',
    kind: 'equipmentFailure',
    severity: 'minor',
    hoursAgo: 50,
    site: 'the-bells',
    narrative:
      'Second stage free-flowed at 24 m on the wall between the Bells and the Blue Hole. Guide switched the diver to the octopus and both surfaced on a normal ascent with a three-minute stop. Regulator withdrawn from service and sent for servicing the same afternoon.',
    chamberTreatment: false,
    diveProfile: { maxDepthM: 24, bottomTimeMin: 38, ascentRateMPerMin: 8, safetyStopMin: 3 },
    // Still open: the centre's own review of the servicing interval has not
    // closed, and "what changed as a result" is the field that makes this a
    // record rather than a log. It stays empty until there is an answer.
    resolvedHoursAgo: null,
    resolution: null,
  },
  {
    reference: 'IN-2290',
    vendorSlug: 'blue-beach-freediving',
    bookingReference: 'DF-4409',
    kind: 'lostDiver',
    severity: 'nearMiss',
    hoursAgo: 74,
    site: 'blue-hole',
    narrative:
      'Buddy pair on the line lost sight of each other during a surface interval when a boat wake pushed one of them off the buoy. Reunited within four minutes by the safety diver. Buoy line shortened and the pair briefed again before the next descent.',
    chamberTreatment: false,
    diveProfile: null,
    resolvedHoursAgo: 72,
    resolution: 'Buoy line shortened to 25 m and the surface-marker rule re-briefed to the whole group.',
  },
];

export interface SeedDispute {
  readonly bookingReference: string;
  readonly status:
    | 'open'
    | 'awaitingTraveler'
    | 'awaitingVendor'
    | 'underReview'
    | 'resolved'
    | 'escalated'
    | 'closed';
  readonly reasonKey: string;
  readonly description: string;
  readonly claimedMinor: number | null;
  readonly resolvedMinor: number | null;
  readonly openedHoursAgo: number;
  readonly resolvedHoursAgo: number | null;
  readonly resolutionNote: string | null;
}

export const DISPUTES: readonly SeedDispute[] = [
  {
    bookingReference: 'DF-4460',
    status: 'underReview',
    reasonKey: 'dispute.reason.notAsDescribed',
    description:
      'The listing promises a radio helmet so the instructor can talk you through the session. There was no radio on the day and the instructor shouted from the shore. Asking for half the lesson back.',
    claimedMinor: 90_000,
    resolvedMinor: null,
    openedHoursAgo: 58,
    resolvedHoursAgo: null,
    resolutionNote: null,
  },
  {
    bookingReference: 'DF-4396',
    status: 'resolved',
    reasonKey: 'dispute.reason.noShowContested',
    description:
      'Marked as a no-show. The traveller says the boat left from a different jetty than the one on the voucher and they were waiting at Masbat bridge.',
    claimedMinor: 110_000,
    resolvedMinor: 55_000,
    openedHoursAgo: 380,
    resolvedHoursAgo: 250,
    resolutionNote:
      'Voucher did name the wrong jetty. Half refunded by the operator, meeting point corrected on the listing.',
  },
];

// --- Feature flags --------------------------------------------------------

export interface SeedFeatureFlag {
  readonly key: string;
  readonly description: string;
  readonly isEnabled: boolean;
  readonly rolloutPercentage: number;
}

/**
 * A flag is a dial, not a switch: `rolloutPercentage` is the real control and
 * `isEnabled` only says whether the dial is connected.
 */
export const FEATURE_FLAGS: readonly SeedFeatureFlag[] = [
  {
    key: 'comparison.weightSliders',
    description: 'Weight sliders in the traveller comparison table',
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    key: 'comparison.hiddenCostDetector',
    description: 'Normalises inclusions into one comparable shown price',
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    key: 'vendor.selfServePricing',
    description: 'Operators edit their own pricing rules without a review',
    isEnabled: false,
    rolloutPercentage: 0,
  },
  {
    key: 'traveler.offlineVouchers',
    description: 'Vouchers and site maps saved to the device for patchy signal',
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    key: 'admin.nightDive',
    description: 'Night Dive dark theme across the console',
    isEnabled: true,
    rolloutPercentage: 100,
  },
  {
    key: 'traveler.askBahri',
    description: 'The Ask Bahri assistant on the Discover screen',
    isEnabled: true,
    rolloutPercentage: 25,
  },
];

// --- Conditions -----------------------------------------------------------

/**
 * This morning's readings, as the Today screen shows them.
 *
 * There is no weather provider wired up yet, so these are the seed's own
 * numbers rather than a live observation — September in Dahab: light morning
 * wind, 28 C water, good visibility. The console labels them as the seed.
 */
export const CONDITIONS = {
  windKt: 6,
  waterC: 28,
  visibilityM: 25,
  observedAt: SEED_TODAY,
} as const;
