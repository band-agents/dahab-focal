import { formatCurrency, formatDate, money } from '@dahab/i18n/server';

import {
  Icon,
  Panel,
  Pill,
  RecordList,
  type RecordColumn,
  type Tone,
} from '@/components/console';
import { ConsolePage, resolveLocale } from '@/components/ConsoleShell';
import { DataProblemNotice } from '@/components/DataProblemNotice';
import { api, load } from '@/lib/api';
import { translator } from '@/lib/i18n';

/**
 * A07 · Safety, disputes and trust.
 *
 * Incidents are a RECORD, not a ticket queue, and the difference is the
 * outcome column: every closed report carries what changed because of it. A
 * free-flowing regulator at the Bells that produced a shorter servicing
 * interval is worth more to the next diver than a resolved ticket, and one
 * still under review says so rather than showing a reassuring blank.
 *
 * Impersonation is stated rather than buried: support reproduces a fault as
 * the user, which is not the same as browsing as one.
 */

type Incident = Awaited<ReturnType<typeof api.admin.incidents.query>>[number];
type Dispute = Awaited<ReturnType<typeof api.admin.disputes.query>>[number];
type Moderation = Awaited<ReturnType<typeof api.admin.moderationQueue.query>>[number];

const SEVERITY_TONE: Record<Incident['severity'], Tone> = {
  nearMiss: 'info',
  minor: 'warning',
  serious: 'danger',
  critical: 'danger',
};


const DISPUTE_TONE: Record<string, Tone> = {
  open: 'warning',
  awaitingTraveler: 'info',
  awaitingVendor: 'info',
  underReview: 'warning',
  resolved: 'success',
  escalated: 'danger',
  closed: 'neutral',
};

const MODERATION_TONE: Record<Moderation['status'], Tone> = {
  published: 'success',
  pendingReview: 'warning',
  hidden: 'neutral',
  removed: 'danger',
};

/**
 * Impersonation's limits, as the API enforces them.
 *
 * Stated on the screen rather than only in the code that checks them, because
 * a limit nobody can see is a limit nobody trusts. These are the contract's
 * own numbers; when `user.impersonate` is built, they come from there.
 */
const IMPERSONATION_MAX_MINUTES = 30;

export default async function TrustPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = translator(locale);
  const context = { locale } as const;

  const [incidents, disputes, moderation] = await Promise.all([
    load(() => api.admin.incidents.query()),
    load(() => api.admin.disputes.query()),
    load(() => api.admin.moderationQueue.query()),
  ]);

  const incidentColumns: readonly RecordColumn<Incident>[] = [
    {
      key: 'kind',
      role: 'primary',
      header: t('admin.col.service'),
      width: '18rem',
      cell: (row) => (
        <span className="block">
          <span className="block text-cLabel text-c-text">{t(`admin.incidentKind.${row.kind}`)}</span>
          <span className="block text-cMeta text-c-muted">
            {row.vendorName}
            {row.siteSlug === null ? '' : ` · ${t(siteNameKey(row.siteSlug))}`}
          </span>
          <span className="block font-figure text-cFigureSm text-c-muted">{row.reference}</span>
        </span>
      ),
    },
    {
      key: 'at',
      role: 'secondary',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.occurredAt), context, 'date'),
      width: '11rem',
    },
    {
      key: 'severity',
      role: 'column',
      header: t('admin.col5.severity'),
      width: '12rem',
      cell: (row) => (
        <span className="flex flex-col gap-1">
          <Pill tone={SEVERITY_TONE[row.severity]}>
            {t(`admin.severity.${row.severity}`)}
          </Pill>
          {row.chamberTreatment ? (
            // The chamber is six minutes away and its use is a material fact
            // about the incident, not a footnote.
            <span className="flex items-center gap-2 text-cMeta text-c-bad">
              <Icon name="shield" size={16} />
              {t('admin.trust.chamber')}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'narrative',
      role: 'column',
      header: t('admin.trust.narrative'),
      // The original wording, never summarised away: it is what an
      // investigation actually reads.
      cell: (row) => <span className="text-cMeta text-c-muted">{row.narrative}</span>,
    },
    {
      key: 'outcome',
      role: 'end',
      header: t('admin.col5.outcome'),
      width: '20rem',
      cell: (row) =>
        row.resolution === null ? (
          <span className="text-cMeta text-c-muted">{t('admin.trust.outcomePending')}</span>
        ) : (
          <span className="text-cMeta text-c-text">{row.resolution}</span>
        ),
    },
  ];

  const disputeColumns: readonly RecordColumn<Dispute>[] = [
    {
      key: 'ref',
      role: 'primary',
      header: t('admin.col4.ref'),
      width: '8rem',
      cell: (row) => <span className="font-mono text-cMeta text-c-text">{row.bookingReference}</span>,
    },
    {
      key: 'parties',
      role: 'secondary',
      header: t('admin.col.vendor'),
      cell: (row) => row.vendorName,
      width: '14rem',
    },
    {
      key: 'reason',
      role: 'column',
      header: t('admin.col5.reason'),
      cell: (row) => (
        <span className="block">
          <span className="block font-figure text-cFigureSm text-c-muted">{row.reasonKey}</span>
          <span className="block text-cMeta text-c-text">{row.description}</span>
          {row.resolutionNote === null ? null : (
            <span className="mt-1 block text-cMeta text-c-muted">{row.resolutionNote}</span>
          )}
        </span>
      ),
    },
    {
      key: 'opened',
      role: 'column',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.openedAt), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      role: 'column',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <Pill
          tone={DISPUTE_TONE[row.status] ?? 'neutral'}
        >
          {t(`admin.disputeStatus.${row.status}`)}
        </Pill>
      ),
    },
    {
      key: 'amount',
      role: 'end',
      header: t('admin.col5.claimed'),
      numeric: true,
      width: '11rem',
      // Claimed against resolved, because the gap between them is the whole
      // subject of the row.
      cell: (row) => (
        <span className="flex flex-col items-end">
          <span className="text-cLabel text-c-text">
            {row.claimedMinor === null
              ? '—'
              : formatCurrency(money(row.claimedMinor, row.currency), context)}
          </span>
          {row.resolvedMinor === null ? null : (
            <span className="text-cMeta text-c-muted">
              {formatCurrency(money(row.resolvedMinor, row.currency), context)}
            </span>
          )}
        </span>
      ),
    },
  ];

  const moderationColumns: readonly RecordColumn<Moderation>[] = [
    {
      key: 'subject',
      role: 'primary',
      header: t('admin.col.vendor'),
      cell: (row) => row.vendorName,
      width: '14rem',
    },
    {
      key: 'body',
      role: 'secondary',
      header: t('admin.trust.narrative'),
      cell: (row) => (
        <span className="block">
          {row.title === null ? null : (
            <span className="block text-cLabel text-c-text">{row.title}</span>
          )}
          <span className="block text-cMeta text-c-muted">{row.body ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'locale',
      role: 'column',
      header: t('admin.col5.locale'),
      // The language it was written in, which is what decides who can read it
      // before deciding on it.
      cell: (row) => <span className="font-mono text-cMeta text-c-muted">{row.sourceLocale}</span>,
      width: '8rem',
    },
    {
      key: 'at',
      role: 'column',
      header: t('admin.col5.when'),
      cell: (row) => formatDate(new Date(row.at), context, 'date'),
      width: '11rem',
    },
    {
      key: 'status',
      role: 'end',
      header: t('admin.col.status'),
      width: '13rem',
      cell: (row) => (
        <Pill
          tone={MODERATION_TONE[row.status]}
        >
          {t(`admin.moderationStatus.${row.status}`)}
        </Pill>
      ),
    },
  ];

  return (
    <ConsolePage
      locale={locale}
      current="trust"
      title={t('admin.trust.title')}
      subtitle={t('admin.trust.subtitle')}
    >
      <div className="flex flex-col gap-8">
        {!incidents.ok ? (
          <DataProblemNotice problem={incidents.problem} t={t} title={t('admin.trust.incidents')} />
        ) : (
          <Panel title={t('admin.trust.incidents')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.trust.incidentsSub')}</p>
            {incidents.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="text-cLabel text-c-text-muted">{t('admin.trust.noIncidents')}</p>
              </div>
            ) : (
              <RecordList
                columns={incidentColumns}
                rows={incidents.data}
                rowKey={(row) => row.id}
                caption={t('admin.trust.incidents')}
              />
            )}
          </Panel>
        )}

        {!disputes.ok ? (
          <DataProblemNotice problem={disputes.problem} t={t} title={t('admin.trust.disputes')} />
        ) : (
          <Panel title={t('admin.trust.disputes')} flush>
            <p className="px-4 pb-2 pt-3 text-cMeta text-c-muted">{t('admin.trust.disputesSub')}</p>
            {disputes.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="text-cLabel text-c-text-muted">{t('admin.trust.noDisputes')}</p>
              </div>
            ) : (
              <RecordList
                columns={disputeColumns}
                rows={disputes.data}
                rowKey={(row) => row.id}
                caption={t('admin.trust.disputes')}
              />
            )}
          </Panel>
        )}

        {!moderation.ok ? (
          <DataProblemNotice
            problem={moderation.problem}
            t={t}
            title={t('admin.trust.moderation')}
          />
        ) : (
          <Panel title={t('admin.trust.moderation')} flush>
            {moderation.data.length === 0 ? (
              <div className="flex items-center gap-4 px-4 pb-6">
                <p className="text-cLabel text-c-text-muted">{t('admin.trust.noModeration')}</p>
              </div>
            ) : (
              <RecordList
                columns={moderationColumns}
                rows={moderation.data}
                rowKey={(row) => row.id}
                caption={t('admin.trust.moderation')}
              />
            )}
          </Panel>
        )}

        {/*
          Impersonation gets a panel of its own rather than a settings row: the
          admin role holds every permission, and this is the one that most
          needs its limits visible on the screen that offers it.
        */}
        <Panel title={t('admin.trust.impersonation')}>
          <p className="max-w-prose text-cLabel text-c-text-muted">
            {t('admin.trust.impersonationSub', { minutes: IMPERSONATION_MAX_MINUTES })}
          </p>
        </Panel>
      </div>
    </ConsolePage>
  );
}

/**
 * A dive-site slug as its i18n key.
 *
 * An incident records where it happened as a slug rather than a foreign key,
 * because it can happen somewhere the site table does not list.
 */
function siteNameKey(slug: string): string {
  const camel = slug.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return `diveSite.${camel}`;
}
