import Link from 'next/link';

import { formatNumber } from '@dahab/i18n/server';

import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import { Banner, Icon, Overline, Pill, Stat, StatRow } from '@/components/console';
import { api, load } from '@/lib/api';
import { translator, type Translate } from '@/lib/i18n';
import {
  GROUPS,
  moduleHref,
  moduleTally,
  modulesIn,
  type ConsoleModule,
  type ModuleState,
} from '@/lib/modules';
import type { Locale } from '@dahab/i18n/server';

/**
 * A00 · Home — every module the business needs, on one screen.
 *
 * The console's other screens each answer one question well and none of them
 * says what the console is. On a phone that mattered more than it sounds: the
 * tab bar carries five sections, so nine-tenths of the product lived behind a
 * list nobody would think to open.
 *
 * The grid is honest about what does not exist. Twelve of these modules have
 * seeded tables and no screen — pricing rules, exchange rates, the equipment
 * register, the message inbox, the availability calendar, and the comparison
 * engine that is the reason this product exists rather than being another
 * booking site. They are drawn as tiles that plainly say so, and they are not
 * links, because a tile that navigates to a 404 teaches people to distrust
 * the whole grid.
 *
 * Every live figure on this page comes from the one overview query the Today
 * screen already makes. Drawing a grid of twenty-eight tiles must not cost
 * twenty-eight round trips.
 */

const STATE_TONE = {
  live: 'success',
  partial: 'warning',
  planned: 'neutral',
} as const satisfies Record<ModuleState, 'success' | 'warning' | 'neutral'>;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [overview, health] = await Promise.all([
    load(() => api.admin.overview.query()),
    load(() => api.health.query()),
  ]);

  const tally = moduleTally();

  /** The live figure for a tile, where the module declares one. */
  const signalFor = (module: ConsoleModule): string | null => {
    if (module.signal === undefined) return null;
    if (module.signal === 'health') {
      if (!health.ok) return t('admin.home.healthDown');
      return t(`admin.home.health.${health.data.status}`);
    }
    if (!overview.ok) return null;
    const value = overview.data[module.signal];
    return typeof value === 'number' ? formatNumber(value, context) : null;
  };

  return (
    <ConsolePage
      locale={locale}
      current="home"
      title={t('admin.home.title')}
      subtitle={t('admin.home.subtitle')}
      {...(overview.ok
        ? { badges: { vendors: overview.data.needsAction, expiry: overview.data.expiringSoon } }
        : {})}
    >
      <Stack>
        {/*
          The one thing this screen knows that no other screen does: how much
          of the platform is actually reachable from here.
        */}
        <StatRow>
          <Stat label={t('admin.home.live')} value={formatNumber(tally.live, context)} />
          <Stat
            label={t('admin.home.partial')}
            value={formatNumber(tally.partial, context)}
            {...(tally.partial > 0 ? { tone: 'warning' as const } : {})}
          />
          <Stat
            label={t('admin.home.planned')}
            value={formatNumber(tally.planned, context)}
            {...(tally.planned > 0 ? { tone: 'warning' as const } : {})}
          />
        </StatRow>

        {!health.ok || health.data.status === 'ok' ? null : (
          <Banner
            tone="warning"
            icon="pulse"
            title={t('admin.home.degradedTitle')}
            detail={Object.entries(health.data.checks)
              .map(([name, state]) => `${name}: ${state}`)
              .join(' · ')}
          />
        )}

        {GROUPS.map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <Overline>{t(`admin.home.group.${group}`)}</Overline>
            {/*
              Two across on a phone. A module tile has to carry an icon, a
              name, a line of purpose and a state — three across leaves the
              name on two lines and the purpose truncated to nothing.
            */}
            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {modulesIn(group).map((module) => (
                <li key={module.key} className="contents">
                  <ModuleTile
                    module={module}
                    locale={locale}
                    t={t}
                    signal={signalFor(module)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Stack>
    </ConsolePage>
  );
}

function ModuleTile({
  module,
  locale,
  t,
  signal,
}: {
  module: ConsoleModule;
  locale: Locale;
  t: Translate;
  signal: string | null;
}) {
  const href = moduleHref(locale, module);
  const name = t(`admin.module.${module.key}.name`);
  const purpose = t(`admin.module.${module.key}.purpose`);

  const body = (
    <>
      <span className="flex items-start gap-2">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-c-sm ${
            module.state === 'planned' ? 'bg-c-raised text-c-muted' : 'bg-c-info-bg text-c-info'
          }`}
        >
          <Icon name={module.icon} size={19} />
        </span>
        {signal === null ? null : (
          <span className="ms-auto shrink-0 font-figure text-cFigureSm tabular-nums text-c-muted">
            {signal}
          </span>
        )}
      </span>
      <span className="mt-2 block font-console text-cLabel text-c-text">{name}</span>
      <span className="mt-0.5 block font-console text-cMeta text-c-muted">{purpose}</span>
      {module.state === 'live' ? null : (
        <span className="mt-2 block">
          <Pill
            tone={STATE_TONE[module.state]}
            // A clock, not a plus: "not built" is a thing that is coming, and
            // a plus on a tile nobody can tap reads as an invitation to add it.
            icon={module.state === 'planned' ? 'clock' : 'chevronEnd'}
          >
            {t(`admin.home.state.${module.state}`)}
          </Pill>
        </span>
      )}
    </>
  );

  const shell = 'flex min-w-0 flex-col rounded-c-md border border-c-edge bg-c-surface p-3';

  // A planned module is not a link. There is nothing to open, and a tile that
  // 404s teaches people to stop trusting the rest of the grid.
  return href === null ? (
    <div className={`${shell} opacity-90`}>{body}</div>
  ) : (
    <Link
      href={href}
      className={`${shell} transition-colors hover:border-c-edge-strong hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus`}
    >
      {body}
    </Link>
  );
}

export const dynamic = 'force-dynamic';
