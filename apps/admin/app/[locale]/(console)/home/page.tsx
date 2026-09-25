import Link from 'next/link';
import type { Route } from 'next';

import { formatCurrency, formatDate, formatNumber, isolate, money } from '@dahab/i18n/server';

import { signOut } from '@/app/[locale]/sign-in/actions';
import { ConsolePage, Stack, resolveLocale } from '@/components/ConsoleShell';
import { Action, Icon, Overline, type IconName } from '@/components/console';
import { ModuleLauncher, type LauncherModule } from '@/components/console/ModuleLauncher';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';
import { MODULES, moduleHref } from '@/lib/modules';
import { path, sectionHref } from '@/lib/nav';
import { viewer } from '@/lib/viewer';

/**
 * A00 · Home — what needs you, and every door in the console.
 *
 * Three things, in the order somebody opening this on a phone wants them.
 *
 * **What needs you now.** Not a dashboard of numbers: only what is asking
 * for a decision, each one a card that opens the screen where it is dealt
 * with. Three operators who cannot publish, seven documents waiting, an open
 * incident. When nothing needs anyone, it says so — "all clear" is an answer
 * worth giving plainly rather than a row of zeros to read.
 *
 * **Every module, as a launcher.** Coloured by the part of the business it
 * belongs to, with a search that filters as you type and opens the first
 * match on Enter.
 *
 * **What is not built yet**, folded away. It used to fill half this screen
 * with tiles that went nowhere, which made a working console look unfinished.
 * It is still said — a console that silently drops what it lacks is how a
 * team finds out in month four — but once, and out of the way.
 *
 * The coverage figures that used to open this page ("9 modules live") were
 * facts about the software, not about the business. They are gone.
 */

type Tone = 'danger' | 'warning' | 'info';

const TONE: Record<Tone, string> = {
  danger: 'bg-c-bad-bg text-c-bad',
  warning: 'bg-c-warn-bg text-c-warn',
  info: 'bg-c-info-bg text-c-info',
};

interface Need {
  readonly key: string;
  readonly tone: Tone;
  readonly icon: IconName;
  readonly figure: string;
  readonly label: string;
  readonly note?: string;
  readonly href: Route;
}

/** Morning, afternoon or evening — in Cairo, which is where every admin is. */
function partOfDay(now: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Africa/Cairo',
    }).format(now),
  );
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;
  const now = new Date();

  // `viewer` is cached for the render, so on a full load this reuses the
  // layout's own answer rather than asking again.
  const [overview, health, who] = await Promise.all([
    load(() => api.admin.overview.query()),
    load(() => api.health.query()),
    viewer(),
  ]);

  const o = overview.ok ? overview.data : null;

  /*
   * Only what is asking for a decision, most urgent first. A zero is not a
   * card: "0 open incidents" is a row of reassurance somebody has to read
   * before reaching the thing that actually needs them.
   */
  const needs: Need[] = [];
  if (o !== null) {
    if (o.blockingExpiries > 0) {
      needs.push({
        key: 'blocking',
        tone: 'danger',
        icon: 'ban',
        figure: formatNumber(o.blockingExpiries, context),
        label: t('admin.home.need.blocking', { count: o.blockingExpiries }),
        href: sectionHref(locale, 'expiry'),
      });
    }
    if (o.incidentsOpen > 0) {
      needs.push({
        key: 'incidents',
        tone: 'danger',
        icon: 'shield',
        figure: formatNumber(o.incidentsOpen, context),
        label: t('admin.home.need.incidents', { count: o.incidentsOpen }),
        href: sectionHref(locale, 'trust'),
      });
    }
    if (o.needsAction > 0) {
      needs.push({
        key: 'action',
        tone: 'warning',
        icon: 'doc',
        figure: formatNumber(o.needsAction, context),
        label: t('admin.home.need.action', { count: o.needsAction }),
        href: sectionHref(locale, 'vendors'),
      });
    }
    if (o.departuresToday > 0) {
      needs.push({
        key: 'departures',
        tone: 'info',
        icon: 'boat',
        figure: formatNumber(o.departuresToday, context),
        label: t('admin.home.need.departures', { count: o.departuresToday }),
        note: t('admin.today.seats', {
          booked: formatNumber(o.seatsBookedToday, context),
          total: formatNumber(o.seatsCapacityToday, context),
        }),
        href: sectionHref(locale, 'bookings'),
      });
    }
    if (o.payoutsDueCount > 0) {
      needs.push({
        key: 'payouts',
        tone: 'info',
        icon: 'money',
        figure: formatNumber(o.payoutsDueCount, context),
        label: t('admin.home.need.payouts', { count: o.payoutsDueCount }),
        note: formatCurrency(money(o.payoutsDueMinor, o.currency), context),
        href: sectionHref(locale, 'money'),
      });
    }
  }

  const signalFor = (signal: (typeof MODULES)[number]['signal']): string | null => {
    if (signal === undefined || signal === 'health' || o === null) return null;
    const value = o[signal];
    return typeof value === 'number' && value > 0 ? formatNumber(value, context) : null;
  };

  const launcher: LauncherModule[] = MODULES.flatMap((module) => {
    const href = moduleHref(locale, module);
    if (href === null) return [];
    return [
      {
        key: module.key,
        name: t(`admin.module.${module.key}.name`),
        purpose: t(`admin.module.${module.key}.purpose`),
        href,
        icon: module.icon,
        area: module.group,
        signal: signalFor(module.signal),
      },
    ];
  });

  const planned = MODULES.filter((module) => module.state === 'planned');
  const degraded = health.ok && health.data.status !== 'ok';
  const email = who.ok ? who.viewer.email : null;

  return (
    <ConsolePage
      locale={locale}
      current="home"
      title={t(`admin.home.greeting.${partOfDay(now)}`)}
      subtitle={formatDate(now, context, 'date')}
    >
      <Stack>
        {degraded ? (
          <Link
            href={sectionHref(locale, 'platform')}
            className="flex items-center gap-2.5 rounded-c-sm bg-c-warn-bg px-3.5 py-2.5 font-console text-cLabel text-c-warn focus-visible:outline focus-visible:outline-2 focus-visible:outline-c-focus"
          >
            <Icon name="pulse" size={18} className="shrink-0" />
            <span className="min-w-0 flex-1">{t('admin.home.degradedTitle')}</span>
            <Icon name="chevronEnd" size={15} className="shrink-0" />
          </Link>
        ) : null}

        <section className="flex flex-col gap-2">
          <Overline>{t('admin.home.needsYou')}</Overline>
          {needs.length === 0 ? (
            <div className="flex items-center gap-3 rounded-c-md border border-c-edge bg-c-surface px-4 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-c-ok-bg text-c-ok">
                <Icon name="check" size={20} weight="bold" />
              </span>
              <span className="min-w-0">
                <span className="block font-console text-cLabel text-c-text">
                  {t('admin.home.allClear')}
                </span>
                <span className="block font-console text-cMeta text-c-muted">
                  {t('admin.home.allClearDetail')}
                </span>
              </span>
            </div>
          ) : (
            /*
             * A row that scrolls sideways on a phone, snapping card by card,
             * with the next card's edge showing so it is obvious there are
             * more. On a desktop there is room, so it becomes a grid.
             */
            <ul className="-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
              {needs.map((need) => (
                <li key={need.key} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-auto">
                  <Link
                    href={need.href}
                    className="flex h-full items-center gap-3 rounded-c-md border border-c-edge bg-c-surface p-3.5 transition-colors hover:border-c-edge-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus motion-safe:active:scale-[0.98]"
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-c-md ${TONE[need.tone]}`}
                    >
                      <Icon name={need.icon} size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-figure text-cFigure tabular-nums text-c-text">
                        {need.figure}
                      </span>
                      <span className="block truncate font-console text-cMeta text-c-text">
                        {need.label}
                      </span>
                      {need.note === undefined ? null : (
                        <span className="block truncate font-console text-cMeta text-c-muted">
                          {need.note}
                        </span>
                      )}
                    </span>
                    <Icon name="chevronEnd" size={16} className="shrink-0 text-c-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <Overline>{t('admin.home.quick')}</Overline>
          <ul className="flex flex-wrap gap-2">
            {(
              [
                { key: 'addAccount', icon: 'plus', href: path(locale, 'people?act=new') },
                { key: 'review', icon: 'shield', href: sectionHref(locale, 'vendors') },
                { key: 'cancel', icon: 'wind', href: sectionHref(locale, 'bookings') },
              ] as const
            ).map((action) => (
              <li key={action.key}>
                <Link
                  href={action.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-c-edge bg-c-surface px-4 font-console text-cLabel text-c-text transition-colors hover:border-c-edge-strong hover:bg-c-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c-focus motion-safe:active:scale-95"
                >
                  <Icon name={action.icon} size={17} className="text-c-link" />
                  {t(`admin.home.quickAction.${action.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <Overline>{t('admin.home.modules')}</Overline>
          <ModuleLauncher
            modules={launcher}
            searchLabel={t('admin.home.searchLabel')}
            searchPlaceholder={t('admin.home.searchPlaceholder')}
            noMatch={t('admin.home.noMatch')}
          />
        </section>

        {/*
          Said once, folded away. Native <details>, so it opens with no
          JavaScript and a screen reader announces it as expandable.
        */}
        <details className="group rounded-c-md border border-c-edge bg-c-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-4 font-console text-cLabel text-c-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-c-focus [&::-webkit-details-marker]:hidden">
            <Icon name="clock" size={17} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {t('admin.home.comingNext', { count: planned.length })}
            </span>
            <Icon
              name="chevronDown"
              size={16}
              className="shrink-0 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <ul className="flex flex-wrap gap-1.5 border-t border-c-edge px-4 py-3">
            {planned.map((module) => (
              <li
                key={module.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-c-raised px-2.5 py-1 font-console text-cMeta text-c-muted"
              >
                <Icon name={module.icon} size={14} />
                {t(`admin.module.${module.key}.name`)}
              </li>
            ))}
          </ul>
        </details>

        {/*
          The account, on a phone. On a desktop it lives at the foot of the
          rail; a phone has no rail, and signing out should not require
          knowing where a hidden menu is.
        */}
        <section className="flex flex-col gap-2 lg:hidden">
          <Overline>{t('admin.home.account')}</Overline>
          <div className="flex items-center gap-3 rounded-c-md border border-c-edge bg-c-surface p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-c-raised text-c-muted">
              <Icon name="people" size={19} />
            </span>
            <span className="min-w-0 flex-1 truncate font-console text-cMeta text-c-muted">
              {email === null ? t('admin.console') : isolate(email)}
            </span>
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <Action type="submit" intent="quiet" icon="ban">
                {t('admin.signOut')}
              </Action>
            </form>
          </div>
        </section>
      </Stack>
    </ConsolePage>
  );
}

export const dynamic = 'force-dynamic';
