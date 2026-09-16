import type { Route } from 'next';

import type { Locale } from '@dahab/i18n/server';
import type { IconName } from '@/components/console';

import { path } from './nav';

/**
 * Everything it takes to run Dahab Focal, as modules.
 *
 * This list is the console's map of the business, and it is deliberately
 * longer than the list of screens that exist. The platform has 59 tables and
 * the console reads about half of them; `pricingRules`, `exchangeRates`,
 * `resources`, `maintenanceLog`, `messageThreads`, `availabilityTemplates`
 * and `meetingPoints` all carry seeded rows that nothing can currently open.
 * Leaving those off the map would make the console look finished when it is
 * not, and the gap would be rediscovered the first time somebody needed to
 * change a price.
 *
 * So `state` is part of the data:
 *
 *   live     a screen exists and reads real rows
 *   partial  it exists inside another screen and has no home of its own
 *   planned  the tables are there; nothing reads them yet
 *
 * A `planned` module is NOT a link. A tile that navigates to a 404 is worse
 * than a tile that says plainly it has not been built, and a console that
 * quietly drops the modules it lacks is how a team discovers in month four
 * that nobody can set a seasonal rate.
 *
 * `evidence` names the tables each module owns. It is there so this file can
 * be checked against the schema rather than believed — a module with no table
 * behind it is either a genuine integration or a mistake, and either way the
 * reader should be able to tell which.
 */

export type ModuleState = 'live' | 'partial' | 'planned';

/** The five questions a marketplace like this gets asked, in order. */
export type ModuleGroup = 'run' | 'supply' | 'demand' | 'money' | 'platform';

export const GROUPS: readonly ModuleGroup[] = ['run', 'supply', 'demand', 'money', 'platform'];

export interface ConsoleModule {
  readonly key: string;
  readonly group: ModuleGroup;
  readonly icon: IconName;
  readonly state: ModuleState;
  /** Path under the locale segment. Only read when the module is not planned. */
  readonly path?: string;
  /** The tables this module is responsible for. Checked against the schema. */
  readonly evidence: readonly string[];
  /**
   * Which live figure belongs on the tile, where one is cheap to get. The Home
   * screen resolves these from the overview it already fetches rather than
   * firing twenty queries to draw a grid.
   */
  readonly signal?:
    | 'needsAction'
    | 'expiringSoon'
    | 'incidentsOpen'
    | 'departuresToday'
    | 'payoutsDueCount'
    | 'health';
}

export const MODULES: readonly ConsoleModule[] = [
  // ── Run the day ────────────────────────────────────────────────────────
  {
    key: 'today',
    group: 'run',
    icon: 'today',
    state: 'live',
    path: '',
    evidence: ['availability_slots', 'bookings', 'incidents'],
    signal: 'departuresToday',
  },
  {
    key: 'bookings',
    group: 'run',
    icon: 'boat',
    state: 'live',
    path: 'bookings',
    evidence: ['bookings', 'booking_participants', 'booking_addons', 'waivers', 'booking_status_history'],
    signal: 'needsAction',
  },
  {
    key: 'availability',
    group: 'run',
    icon: 'calendar',
    // `availability_templates` and `blackout_dates` are seeded and unread. A
    // boat that does not sail in Ramadan is a blackout row nobody can set.
    state: 'planned',
    evidence: ['availability_templates', 'availability_slots', 'blackout_dates'],
  },
  {
    key: 'messages',
    group: 'run',
    icon: 'chat',
    state: 'planned',
    evidence: ['message_threads', 'messages', 'message_translations', 'questions_answers'],
  },
  {
    key: 'conditions',
    group: 'run',
    icon: 'wind',
    // Weather cancels boats and the cascade is built, but nothing measures the
    // wind. This is the one module whose gap is an integration, not a screen.
    state: 'planned',
    evidence: [],
  },

  // ── Supply: the operators ──────────────────────────────────────────────
  {
    key: 'vendors',
    group: 'supply',
    icon: 'operators',
    state: 'live',
    path: 'vendors',
    evidence: ['vendors', 'vendor_documents'],
    signal: 'needsAction',
  },
  {
    key: 'expiry',
    group: 'supply',
    icon: 'clock',
    state: 'live',
    path: 'expiry',
    evidence: ['vendor_documents', 'staff_certifications', 'resource_certifications'],
    signal: 'expiringSoon',
  },
  {
    key: 'fleet',
    group: 'supply',
    icon: 'wrench',
    // Tanks carry hydrostatic test dates and boats carry licences. Both are
    // seeded, neither is readable, and the expiry board cannot see them.
    state: 'planned',
    evidence: ['resources', 'resource_certifications', 'maintenance_log'],
  },
  {
    key: 'team',
    group: 'supply',
    icon: 'people',
    state: 'partial',
    path: 'vendors',
    evidence: ['staff', 'staff_certifications'],
  },
  {
    key: 'payoutAccounts',
    group: 'supply',
    icon: 'key',
    state: 'planned',
    evidence: ['vendor_payout_accounts'],
  },

  // ── Demand: catalogue and travellers ───────────────────────────────────
  {
    key: 'catalog',
    group: 'demand',
    icon: 'tank',
    state: 'live',
    path: 'catalog',
    evidence: ['categories', 'services', 'service_translations', 'attribute_definitions', 'service_attribute_values'],
  },
  {
    key: 'compare',
    group: 'demand',
    icon: 'compare',
    /*
     * The flagship. ~70 attributes, weight sliders and the hidden-cost
     * detector are the reason this is not another booking site, and there is
     * no screen anywhere that tunes any of it — not the weights, not the
     * normalisation, not which inclusions count as a hidden cost.
     */
    state: 'planned',
    evidence: ['attribute_definitions', 'service_attribute_values', 'review_attribute_scores'],
  },
  {
    key: 'options',
    group: 'demand',
    icon: 'filter',
    state: 'planned',
    evidence: ['service_variants', 'service_tiers', 'option_groups', 'options'],
  },
  {
    key: 'people',
    group: 'demand',
    icon: 'people',
    state: 'live',
    path: 'people',
    evidence: ['users', 'user_profiles', 'user_preferences', 'certifications', 'medical_info', 'emergency_contacts'],
  },
  {
    key: 'reviews',
    group: 'demand',
    icon: 'star',
    state: 'partial',
    path: 'trust',
    evidence: ['reviews', 'review_translations', 'review_attribute_scores'],
  },
  {
    key: 'places',
    group: 'demand',
    icon: 'pin',
    state: 'partial',
    path: 'catalog',
    evidence: ['dive_sites', 'service_dive_sites', 'neighborhoods', 'meeting_points', 'pickup_zones'],
  },

  // ── Money ──────────────────────────────────────────────────────────────
  {
    key: 'money',
    group: 'money',
    icon: 'money',
    state: 'live',
    path: 'money',
    evidence: ['payments', 'refunds', 'payouts', 'ledger_entries'],
    signal: 'payoutsDueCount',
  },
  {
    key: 'pricing',
    group: 'money',
    icon: 'tag',
    // Four seeded tables, no screen. Every price on the platform is decided
    // by rows nobody in the console can see, let alone change.
    state: 'planned',
    evidence: ['pricing_models', 'pricing_tiers', 'pricing_rules'],
  },
  {
    key: 'fx',
    group: 'money',
    icon: 'exchange',
    // `exchange_rates` exists and the money screen already admits that no
    // source is connected to fill it.
    state: 'planned',
    evidence: ['exchange_rates'],
  },
  {
    key: 'disputes',
    group: 'money',
    icon: 'reverse',
    state: 'partial',
    path: 'trust',
    evidence: ['disputes', 'refunds'],
  },
  {
    key: 'paymentMethods',
    group: 'money',
    icon: 'plug',
    state: 'planned',
    evidence: ['payment_methods'],
  },

  // ── Trust, and the platform under all of it ────────────────────────────
  {
    key: 'trust',
    group: 'platform',
    icon: 'shield',
    state: 'live',
    path: 'trust',
    evidence: ['incidents', 'disputes', 'reviews'],
    signal: 'incidentsOpen',
  },
  {
    key: 'platform',
    group: 'platform',
    icon: 'filter',
    state: 'live',
    path: 'platform',
    evidence: ['audit_log', 'feature_flags'],
  },
  {
    key: 'access',
    group: 'platform',
    icon: 'key',
    // Roles are visible on the roster now; granting one, revoking one and
    // starting an impersonation are not. Impersonation was designed with a
    // 30-minute cap and a mandatory reason, and none of it is reachable.
    state: 'partial',
    path: 'people',
    evidence: ['user_roles', 'sessions', 'audit_log'],
  },
  {
    key: 'health',
    group: 'platform',
    icon: 'pulse',
    /*
     * Planned, but with a live signal — the one tile where those two are both
     * true. `health` really runs `select 1` and really reports degraded when
     * it cannot, so the figure on this tile is measured rather than claimed;
     * what does not exist is a screen behind it that says which integration
     * is down and since when.
     */
    state: 'planned',
    evidence: [],
    signal: 'health',
  },
  {
    key: 'integrations',
    group: 'platform',
    icon: 'plug',
    state: 'planned',
    evidence: [],
  },
  {
    key: 'jobs',
    group: 'platform',
    icon: 'jobs',
    // The expiry sweep, the payout run and the departure reminders all have
    // to happen on a schedule, and nothing here can say whether they did.
    state: 'planned',
    evidence: [],
  },
  {
    key: 'locales',
    group: 'platform',
    icon: 'doc',
    state: 'partial',
    path: 'platform',
    evidence: ['service_translations', 'review_translations', 'message_translations'],
  },
  {
    key: 'reports',
    group: 'platform',
    icon: 'export',
    state: 'planned',
    evidence: [],
  },
];

/** The route for a module, or null where it has no screen to open. */
export function moduleHref(locale: Locale, module: ConsoleModule): Route | null {
  if (module.state === 'planned' || module.path === undefined) return null;
  return path(locale, module.path);
}

export function modulesIn(group: ModuleGroup): readonly ConsoleModule[] {
  return MODULES.filter((module) => module.group === group);
}

/** How many modules are actually finished, for the line at the top. */
export function moduleTally(): Readonly<Record<ModuleState, number>> {
  return {
    live: MODULES.filter((m) => m.state === 'live').length,
    partial: MODULES.filter((m) => m.state === 'partial').length,
    planned: MODULES.filter((m) => m.state === 'planned').length,
  };
}
